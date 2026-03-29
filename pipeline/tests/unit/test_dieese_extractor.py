"""Testes unitários do extrator/scraper do DIEESE (cesta básica).

Cenários cobertos:
- T020: Extrair cesta básica de SP com tabela válida — deve retornar lista de MonthlyDataPoint
- T021: Tabela sem dados válidos — deve retornar lista vazia
- T022: Página sem tabela (HTML inesperado) — deve lançar erro descritivo
- T023: Valores não numéricos na tabela (*, vazio) — deve ignorar meses inválidos
- T024: Conversão de mês/ano (Jan/2024) pra YYYY-MM — formato correto no output
- T025: Valores com vírgula decimal (708,53) — deve converter pra float (708.53)
- T026: Timeout/erro HTTP no scraping — deve tratar com retry
- T027: HTML com estrutura alterada (resilência) — deve falhar graciosamente
"""

from pathlib import Path

import pytest
import responses

from src.extractors.dieese import (
    URL,
    DIEESEExtractor,
    _parse_date_row,
    _parse_month_header,
    _parse_value,
)
from src.models.indicators import MonthlyDataPoint

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"

FORM_URL = f"{URL}cidade"


def _load_fixture(name: str) -> str:
    """Carrega fixture HTML do diretório de fixtures."""
    return (FIXTURES_DIR / name).read_text(encoding="utf-8")


def _mock_dieese(html: str, status: int = 200) -> None:
    """Registra mock de resposta HTTP POST pro DIEESE."""
    responses.add(responses.POST, FORM_URL, body=html, status=status)


class TestDIEESEExtractorValidTable:
    """T020: Extrair cesta básica de SP com tabela válida."""

    @responses.activate
    def test_returns_list_of_data_points(self):
        """Deve retornar lista de MonthlyDataPoint com dados de SP."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_extracts_sao_paulo_values(self):
        """Deve extrair exatamente os 6 valores de São Paulo."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 6
        assert result[0].value == 708.53
        assert result[1].value == 715.22
        assert result[2].value == 699.10
        assert result[3].value == 720.45
        assert result[4].value == 732.18
        assert result[5].value == 725.90

    @responses.activate
    def test_dates_in_yyyy_mm_format(self):
        """Todas as datas devem estar no formato YYYY-MM."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        for point in result:
            assert len(point.date) == 7
            assert point.date[4] == "-"

    @responses.activate
    def test_values_are_positive_floats(self):
        """Todos os valores devem ser floats positivos."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        for point in result:
            assert isinstance(point.value, float)
            assert point.value > 0

    @responses.activate
    def test_results_sorted_by_date(self):
        """Resultados devem estar ordenados por data."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        dates = [p.date for p in result]
        assert dates == sorted(dates)

    @responses.activate
    def test_filters_by_year_range(self):
        """Deve filtrar dados pelo período solicitado."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2025, end_year=2025)
        assert result == []


class TestDIEESEExtractorEmptyData:
    """T021: Tabela sem dados válidos."""

    @responses.activate
    def test_returns_empty_for_no_valid_data(self):
        """Deve retornar lista vazia quando tabela tem só traços."""
        _mock_dieese(_load_fixture("dieese_no_sp.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []


class TestDIEESEExtractorNoTable:
    """T022: Página sem tabela."""

    @responses.activate
    def test_raises_descriptive_error(self):
        """Deve lançar ValueError com mensagem descritiva."""
        _mock_dieese(_load_fixture("dieese_no_table.html"))
        extractor = DIEESEExtractor()
        with pytest.raises(ValueError, match="Tabela.*não encontrada"):
            extractor.extract(start_year=2024, end_year=2024)


class TestDIEESEExtractorInvalidValues:
    """T023: Valores não numéricos na tabela."""

    @responses.activate
    def test_ignores_non_numeric_values(self, dieese_tabela_valores_invalidos):
        """Deve ignorar meses com valores inválidos (* ou vazio)."""
        _mock_dieese(dieese_tabela_valores_invalidos)
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []

    @responses.activate
    def test_strips_asterisk_from_numeric_value(self):
        """Deve tratar '789,45*' como 789.45 (strip do asterisco)."""
        html = """<html><body>
        <table id="dados" class="display nowrap">
          <thead><tr><th></th><th>Total da Cesta</th></tr></thead>
          <tbody>
            <tr><td>01-2024</td><td>789,45*</td></tr>
            <tr><td>02-2024</td><td>800,12</td></tr>
          </tbody>
        </table>
        </body></html>"""
        _mock_dieese(html)
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 2
        assert result[0].value == 789.45
        assert result[1].value == 800.12

    @responses.activate
    def test_ignores_dash_values(self):
        """Deve ignorar células com traço ('-')."""
        html = """<html><body>
        <table id="dados" class="display nowrap">
          <thead><tr><th></th><th>Total da Cesta</th></tr></thead>
          <tbody>
            <tr><td>01-2024</td><td>-</td></tr>
            <tr><td>02-2024</td><td>800,12</td></tr>
          </tbody>
        </table>
        </body></html>"""
        _mock_dieese(html)
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 1
        assert result[0].date == "2024-02"
        assert result[0].value == 800.12


class TestDIEESEExtractorDateConversion:
    """T024: Conversão de formato de data."""

    def test_parse_month_header_all_months(self):
        """Deve converter todos os meses em português pra YYYY-MM."""
        assert _parse_month_header("Jan/2024") == "2024-01"
        assert _parse_month_header("Fev/2024") == "2024-02"
        assert _parse_month_header("Mar/2024") == "2024-03"
        assert _parse_month_header("Abr/2024") == "2024-04"
        assert _parse_month_header("Mai/2024") == "2024-05"
        assert _parse_month_header("Jun/2024") == "2024-06"
        assert _parse_month_header("Jul/2024") == "2024-07"
        assert _parse_month_header("Ago/2024") == "2024-08"
        assert _parse_month_header("Set/2024") == "2024-09"
        assert _parse_month_header("Out/2024") == "2024-10"
        assert _parse_month_header("Nov/2024") == "2024-11"
        assert _parse_month_header("Dez/2024") == "2024-12"

    def test_parse_month_header_invalid(self):
        """Deve retornar None pra cabeçalhos inválidos."""
        assert _parse_month_header("Invalid") is None
        assert _parse_month_header("Xyz/2024") is None
        assert _parse_month_header("") is None
        assert _parse_month_header("Cidade") is None
        assert _parse_month_header("Jan2024") is None

    def test_parse_date_row_valid(self):
        """Deve converter MM-YYYY e MM/YYYY pra YYYY-MM."""
        assert _parse_date_row("01-2024") == "2024-01"
        assert _parse_date_row("12-2005") == "2005-12"
        assert _parse_date_row("06/2020") == "2020-06"

    def test_parse_date_row_invalid(self):
        """Deve retornar None pra datas inválidas."""
        assert _parse_date_row("") is None
        assert _parse_date_row("Invalid") is None
        assert _parse_date_row("2024-01") is None
        assert _parse_date_row("13-2024") is None
        assert _parse_date_row("00-2024") is None

    @responses.activate
    def test_converts_month_year_to_yyyy_mm(self):
        """T024: Deve converter 01-2024 pra 2024-01 no output."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result[0].date == "2024-01"
        assert result[1].date == "2024-02"
        assert result[2].date == "2024-03"
        assert result[3].date == "2024-04"
        assert result[4].date == "2024-05"
        assert result[5].date == "2024-06"


class TestDIEESEExtractorDecimalComma:
    """T025: Valores com vírgula decimal."""

    def test_parse_value_with_comma(self):
        """Deve converter vírgula decimal pra ponto."""
        assert _parse_value("708,53") == 708.53
        assert _parse_value("1.234,56") == 1234.56

    def test_parse_value_with_dot(self):
        """Deve aceitar valor com ponto decimal."""
        assert _parse_value("708.53") == 708.53

    def test_parse_value_with_asterisk(self):
        """Deve remover asterisco e converter valor."""
        assert _parse_value("789,45*") == 789.45
        assert _parse_value("500,00*") == 500.0

    def test_parse_value_empty_and_invalid(self):
        """Deve retornar None pra valores inválidos."""
        assert _parse_value("") is None
        assert _parse_value("*") is None
        assert _parse_value("-") is None
        assert _parse_value("   ") is None
        assert _parse_value("abc") is None

    @responses.activate
    def test_converts_comma_to_dot_in_extraction(self):
        """T025: Deve converter 708,53 pra 708.53 na extração completa."""
        _mock_dieese(_load_fixture("dieese_valid.html"))
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result[0].value == 708.53


class TestDIEESEExtractorHTTPErrors:
    """T026: Tratamento de erros HTTP."""

    @responses.activate
    def test_retries_on_connection_error(self):
        """T026: Deve fazer retry e recuperar após falhas transitórias."""
        responses.add(responses.POST, FORM_URL, body=ConnectionError("timeout"))
        responses.add(responses.POST, FORM_URL, body=ConnectionError("timeout"))
        responses.add(
            responses.POST,
            FORM_URL,
            body=_load_fixture("dieese_valid.html"),
            status=200,
        )
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 6

    @responses.activate
    def test_raises_after_all_retries_exhausted(self):
        """Deve lançar exceção após esgotar todas as tentativas."""
        for _ in range(3):
            responses.add(responses.POST, FORM_URL, body=ConnectionError("timeout"))
        extractor = DIEESEExtractor()
        with pytest.raises(ConnectionError):
            extractor.extract(start_year=2024, end_year=2024)

    @responses.activate
    def test_raises_on_http_500(self):
        """Deve lançar exceção em erro HTTP 500."""
        for _ in range(3):
            responses.add(responses.POST, FORM_URL, status=500)
        extractor = DIEESEExtractor()
        with pytest.raises(Exception):
            extractor.extract(start_year=2024, end_year=2024)


class TestDIEESEExtractorResilience:
    """T027: Resiliência a mudanças no HTML."""

    @responses.activate
    def test_fails_gracefully_on_changed_html(self):
        """T027: Deve lançar ValueError descritivo se estrutura mudar."""
        html = "<html><body><p>Página completamente diferente</p></body></html>"
        _mock_dieese(html)
        extractor = DIEESEExtractor()
        with pytest.raises(ValueError, match="Tabela.*não encontrada"):
            extractor.extract(start_year=2024, end_year=2024)

    @responses.activate
    def test_fails_gracefully_on_empty_html(self):
        """Deve lançar ValueError com HTML vazio."""
        _mock_dieese("")
        extractor = DIEESEExtractor()
        with pytest.raises(ValueError):
            extractor.extract(start_year=2024, end_year=2024)

    @responses.activate
    def test_returns_empty_on_table_without_tbody(self):
        """Deve retornar lista vazia se tabela não tem corpo."""
        html = """<html><body>
        <table id="dados" class="display nowrap">
          <thead>
            <tr><th></th><th>Total da Cesta</th></tr>
          </thead>
        </table>
        </body></html>"""
        _mock_dieese(html)
        extractor = DIEESEExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []
