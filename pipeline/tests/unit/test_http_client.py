"""Testes unitários do cliente HTTP com retry."""

import pytest
import responses
from responses import matchers

from src.utils.http_client import (
    DEFAULT_TIMEOUT,
    download_file,
    fetch_bytes,
    fetch_json,
    fetch_text,
    post_form,
)


MOCK_URL = "https://api.example.com/data"


class TestFetchJSON:
    """Testes de fetch_json."""

    @responses.activate
    def test_returns_dict(self):
        """Deve retornar dict quando API retorna JSON object."""
        responses.get(MOCK_URL, json={"key": "value"}, status=200)
        result = fetch_json(MOCK_URL)
        assert result == {"key": "value"}

    @responses.activate
    def test_returns_list(self):
        """Deve retornar list quando API retorna JSON array."""
        data = [{"data": "01/01/2024", "valor": "11.75"}]
        responses.get(MOCK_URL, json=data, status=200)
        result = fetch_json(MOCK_URL)
        assert result == data

    @responses.activate
    def test_passes_params(self):
        """Deve enviar query params na requisição."""
        responses.get(
            MOCK_URL,
            json={"ok": True},
            status=200,
            match=[matchers.query_param_matcher({"formato": "json"})],
        )
        result = fetch_json(MOCK_URL, params={"formato": "json"})
        assert result == {"ok": True}

    @responses.activate
    def test_retries_on_500(self):
        """Deve fazer retry após HTTP 500 e retornar na 2ª tentativa."""
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, json={"ok": True}, status=200)
        result = fetch_json(MOCK_URL, max_retries=2)
        assert result == {"ok": True}
        assert len(responses.calls) == 2

    @responses.activate
    def test_retries_three_times_then_raises(self):
        """Deve falhar após 3 tentativas com exceção clara."""
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, status=500)
        with pytest.raises(Exception):
            fetch_json(MOCK_URL, max_retries=3)
        assert len(responses.calls) == 3

    @responses.activate
    def test_retries_on_connection_error(self):
        """Deve fazer retry em erro de conexão."""
        responses.get(MOCK_URL, body=ConnectionError("Conexão recusada"))
        responses.get(MOCK_URL, json={"ok": True}, status=200)
        result = fetch_json(MOCK_URL, max_retries=2)
        assert result == {"ok": True}

    @responses.activate
    def test_empty_json_response(self):
        """Deve retornar lista vazia quando API retorna []."""
        responses.get(MOCK_URL, json=[], status=200)
        result = fetch_json(MOCK_URL)
        assert result == []


class TestFetchText:
    """Testes de fetch_text."""

    @responses.activate
    def test_returns_html(self):
        """Deve retornar texto HTML da resposta."""
        html = "<html><body><table></table></body></html>"
        responses.get(MOCK_URL, body=html, status=200)
        result = fetch_text(MOCK_URL)
        assert "<table>" in result

    @responses.activate
    def test_retries_on_error(self):
        """Deve fazer retry em erro e retornar na próxima tentativa."""
        responses.get(MOCK_URL, status=503)
        responses.get(MOCK_URL, body="OK", status=200)
        result = fetch_text(MOCK_URL, max_retries=2)
        assert result == "OK"

    @responses.activate
    def test_raises_after_retries(self):
        """Deve falhar após esgotar tentativas."""
        responses.get(MOCK_URL, status=503)
        responses.get(MOCK_URL, status=503)
        with pytest.raises(Exception):
            fetch_text(MOCK_URL, max_retries=2)


class TestDownloadFile:
    """Testes de download_file."""

    @responses.activate
    def test_saves_file(self, tmp_path):
        """Deve salvar conteúdo no caminho indicado."""
        content = b"col1;col2\nval1;val2\n"
        responses.get(MOCK_URL, body=content, status=200)
        dest = str(tmp_path / "data.csv")
        result = download_file(MOCK_URL, dest)
        assert (tmp_path / "data.csv").read_bytes() == content
        assert "data.csv" in result

    @responses.activate
    def test_creates_parent_dirs(self, tmp_path):
        """Deve criar diretórios intermediários se não existirem."""
        content = b"data"
        responses.get(MOCK_URL, body=content, status=200)
        dest = str(tmp_path / "sub" / "dir" / "file.csv")
        download_file(MOCK_URL, dest)
        assert (tmp_path / "sub" / "dir" / "file.csv").exists()

    @responses.activate
    def test_retries_on_error(self, tmp_path):
        """Deve fazer retry em erro de download."""
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, body=b"ok", status=200)
        dest = str(tmp_path / "file.csv")
        download_file(MOCK_URL, dest, max_retries=2)
        assert (tmp_path / "file.csv").read_bytes() == b"ok"


class TestPostForm:
    """Testes de post_form."""

    @responses.activate
    def test_returns_html(self):
        """Deve retornar texto HTML da resposta POST."""
        html = "<html><body><table id='dados'></table></body></html>"
        responses.post(MOCK_URL, body=html, status=200)
        result = post_form(MOCK_URL, data={"key": "value"})
        assert "<table" in result

    @responses.activate
    def test_retries_on_error(self):
        """Deve fazer retry em erro e retornar na próxima tentativa."""
        responses.post(MOCK_URL, status=503)
        responses.post(MOCK_URL, body="OK", status=200)
        result = post_form(MOCK_URL, data={}, max_retries=2)
        assert result == "OK"

    @responses.activate
    def test_raises_after_retries(self):
        """Deve falhar após esgotar tentativas."""
        responses.post(MOCK_URL, status=503)
        responses.post(MOCK_URL, status=503)
        with pytest.raises(Exception):
            post_form(MOCK_URL, data={}, max_retries=2)


class TestFetchBytes:
    """Testes de fetch_bytes."""

    @responses.activate
    def test_returns_bytes(self):
        """Deve retornar conteúdo como bytes."""
        content = b"\x50\x4b\x03\x04binary_data"
        responses.get(MOCK_URL, body=content, status=200)
        result = fetch_bytes(MOCK_URL)
        assert result == content

    @responses.activate
    def test_retries_on_error(self):
        """Deve fazer retry em erro."""
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, body=b"ok", status=200)
        result = fetch_bytes(MOCK_URL, max_retries=2)
        assert result == b"ok"


class TestBackoffTiming:
    """Testes do mecanismo de backoff."""

    @responses.activate
    def test_backoff_increases_exponentially(self, monkeypatch):
        """Deve chamar sleep com valores de backoff exponencial."""
        import src.utils.http_client as mod

        sleep_calls: list[float] = []
        monkeypatch.setattr(mod.time, "sleep", lambda s: sleep_calls.append(s))

        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, status=500)
        responses.get(MOCK_URL, json={"ok": True}, status=200)

        fetch_json(MOCK_URL, max_retries=3)
        assert sleep_calls == [2, 4]
