"""Testes unitários do extrator de dados da ANP (gasolina).

Cenários cobertos:
- T030: Extrair preço médio de gasolina com CSV válido — deve retornar lista de MonthlyDataPoint
- T031: Filtrar apenas GASOLINA COMUM — deve ignorar outros combustíveis
- T032: Agrupar por mês e calcular média nacional — agregação correta
- T033: CSV vazio (só header) — deve retornar lista vazia
- T034: CSV com encoding latin-1 — deve decodificar corretamente
- T035: Conversão de data dd/mm/aaaa pra YYYY-MM — formato correto no output
- T036: Timeout/erro HTTP no download — deve tratar com retry
- T037: CSV com linhas malformadas — deve ignorar linhas inválidas
"""

from pathlib import Path

import pytest
import responses

from src.extractors.anp import (
    BASE_URL,
    ANPExtractor,
    _parse_date,
    _parse_price,
)
from src.models.indicators import MonthlyDataPoint

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def _load_fixture(name: str) -> str:
    """Carrega fixture CSV do diretório de fixtures."""
    return (FIXTURES_DIR / name).read_text(encoding="utf-8")


def _csv_header(csv_content: str) -> str:
    """Retorna apenas o header de um CSV."""
    return csv_content.split("\n")[0] + "\n"


def _mock_anp(csv_content: str, year: int = 2024) -> None:
    """Registra mocks HTTP pros 2 semestres de um ano."""
    header = _csv_header(csv_content)
    responses.add(
        responses.GET,
        f"{BASE_URL}/ca-{year}-01.csv",
        body=csv_content,
        status=200,
    )
    responses.add(
        responses.GET,
        f"{BASE_URL}/ca-{year}-02.csv",
        body=header,
        status=200,
    )


# ==================== T030 ====================


class TestANPExtractorValidCSV:
    """T030: Extrair preço médio com CSV válido."""

    @responses.activate
    def test_returns_list_of_data_points(self):
        """Deve retornar lista de MonthlyDataPoint."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    @responses.activate
    def test_dates_in_yyyy_mm_format(self):
        """Todas as datas devem estar no formato YYYY-MM."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        for point in result:
            assert len(point.date) == 7
            assert point.date[4] == "-"

    @responses.activate
    def test_values_are_positive_floats(self):
        """Todos os valores devem ser floats positivos."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        for point in result:
            assert isinstance(point.value, float)
            assert point.value > 0

    @responses.activate
    def test_results_sorted_by_date(self):
        """Resultados devem estar ordenados por data."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        dates = [p.date for p in result]
        assert dates == sorted(dates)


# ==================== T031 ====================


class TestANPExtractorFuelFilter:
    """T031: Filtrar apenas GASOLINA COMUM."""

    @responses.activate
    def test_excludes_ethanol_and_diesel(self):
        """Deve filtrar registros de etanol e diesel."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        # Fixture tem 9 registros de gasolina, 1 etanol, 1 diesel
        # Após agregação mensal: 2 meses (jan + fev)
        assert len(result) == 2

    @responses.activate
    def test_only_gasolina_values_in_result(self):
        """Valores devem refletir apenas preços de gasolina comum."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        # Etanol (3.79) e diesel (5.49) não devem puxar a média pra baixo
        for point in result:
            assert point.value > 5.0


# ==================== T032 ====================


class TestANPExtractorMonthlyAggregation:
    """T032: Agrupar por mês e calcular média nacional."""

    @responses.activate
    def test_aggregates_by_month(self):
        """Deve ter um ponto de dados por mês."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 2
        assert result[0].date == "2024-01"
        assert result[1].date == "2024-02"

    @responses.activate
    def test_calculates_national_average(self):
        """Média deve considerar todos os postos do país.

        Jan 2024: (5.79 + 5.89 + 5.85 + 6.09 + 6.15 + 5.99) / 6 = 5.96
        Fev 2024: (5.95 + 5.92 + 5.82) / 3 = 5.8967
        """
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result[0].value == 5.96
        assert result[1].value == 5.8967

    @responses.activate
    def test_filters_by_year_range(self):
        """Deve retornar vazio se período não tem dados."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2025, end_year=2025)
        # Dados são de 2024, pedindo 2025 retorna vazio
        assert result == []


# ==================== T033 ====================


class TestANPExtractorEmptyCSV:
    """T033: CSV vazio (só header)."""

    @responses.activate
    def test_returns_empty_list(self):
        """Deve retornar lista vazia sem lançar exceção."""
        empty_csv = _load_fixture("anp_empty.csv")
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=empty_csv,
            status=200,
        )
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=empty_csv,
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []


# ==================== T034 ====================


class TestANPExtractorLatin1Encoding:
    """T034: CSV com encoding latin-1."""

    @responses.activate
    def test_decodes_latin1_correctly(self):
        """Deve decodificar CSV latin-1 sem erro."""
        csv_content = (
            "Regiao - Sigla;Estado - Sigla;Municipio;Revenda;"
            "CNPJ da Revenda;Nome da Rua;Numero Rua;Complemento;"
            "Bairro;Cep;Produto;Data da Coleta;Valor de Venda;"
            "Valor de Compra;Unidade de Medida;Bandeira\n"
            "SUDESTE;SP;S\xe3o Paulo;POSTO EXEMPLO;"
            "00.000.000/0001-00;Rua \xc1gua;100;;Centro;01000-000;"
            "GASOLINA COMUM;01/01/2024;5,79;5,10;R$ / litro;BRANCA\n"
        )
        latin1_bytes = csv_content.encode("latin-1")
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=latin1_bytes,
            content_type="text/csv; charset=iso-8859-1",
            status=200,
        )
        header_bytes = csv_content.split("\n")[0].encode("latin-1") + b"\n"
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=header_bytes,
            content_type="text/csv; charset=iso-8859-1",
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 1
        assert result[0].date == "2024-01"
        assert result[0].value == 5.79


# ==================== T035 ====================


class TestANPExtractorDateConversion:
    """T035: Conversão de formato de data."""

    def test_parse_date_standard(self):
        """Deve converter dd/mm/aaaa pra YYYY-MM."""
        assert _parse_date("01/01/2024") == "2024-01"
        assert _parse_date("15/06/2020") == "2020-06"
        assert _parse_date("31/12/2005") == "2005-12"

    def test_parse_date_invalid(self):
        """Deve retornar None pra datas inválidas."""
        assert _parse_date("") is None
        assert _parse_date("invalido") is None
        assert _parse_date("2024-01-01") is None
        assert _parse_date("01/13/2024") is None

    def test_parse_price_valid(self):
        """Deve converter preços com vírgula e ponto."""
        assert _parse_price("5.79") == 5.79
        assert _parse_price("5,79") == 5.79
        assert _parse_price("6.15") == 6.15

    def test_parse_price_invalid(self):
        """Deve retornar None pra preços inválidos."""
        assert _parse_price("") is None
        assert _parse_price("abc") is None
        assert _parse_price("-1.0") is None
        assert _parse_price(float("nan")) is None

    @responses.activate
    def test_converts_dd_mm_yyyy_to_yyyy_mm(self):
        """T035: Datas no output devem estar em YYYY-MM."""
        _mock_anp(_load_fixture("anp_valid.csv"))
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result[0].date == "2024-01"
        assert result[1].date == "2024-02"


# ==================== T036 ====================


class TestANPExtractorHTTPErrors:
    """T036: Tratamento de erros HTTP."""

    @responses.activate
    def test_retries_on_connection_error(self):
        """T036: Deve fazer retry e recuperar após falhas transitórias."""
        csv_content = _load_fixture("anp_valid.csv")
        # Primeiro semestre CSV: 2 falhas depois sucesso
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=ConnectionError("timeout"),
        )
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=ConnectionError("timeout"),
        )
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=csv_content,
            status=200,
        )
        # Segundo semestre: vazio
        header = _csv_header(csv_content)
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=header,
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 2

    @responses.activate
    def test_skips_failed_semester_continues(self):
        """Deve pular semestre que falhou e continuar com os outros."""
        csv_content = _load_fixture("anp_valid.csv")
        # Primeiro semestre CSV: falha total (3 retries)
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-01.csv",
                body=ConnectionError("timeout"),
            )
        # Zip fallback also fails
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-01.zip",
                body=ConnectionError("timeout"),
            )
        # Segundo semestre: sucesso com dados
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=csv_content,
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 2

    @responses.activate
    def test_returns_empty_if_all_fail(self):
        """Deve retornar lista vazia se todos os downloads falharem."""
        # S1: CSV fails, ZIP fails
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-01.csv",
                body=ConnectionError("timeout"),
            )
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-01.zip",
                body=ConnectionError("timeout"),
            )
        # S2: CSV fails, ZIP fails
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-02.csv",
                body=ConnectionError("timeout"),
            )
        for _ in range(3):
            responses.add(
                responses.GET,
                f"{BASE_URL}/ca-2024-02.zip",
                body=ConnectionError("timeout"),
            )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []


# ==================== T037 ====================


class TestANPExtractorMalformedCSV:
    """T037: CSV com linhas malformadas."""

    @responses.activate
    def test_ignores_malformed_lines(self):
        """T037: Deve ignorar linhas com formato inválido."""
        csv_content = (
            "Regiao - Sigla;Estado - Sigla;Municipio;Revenda;"
            "CNPJ da Revenda;Nome da Rua;Numero Rua;Complemento;"
            "Bairro;Cep;Produto;Data da Coleta;Valor de Venda;"
            "Valor de Compra;Unidade de Medida;Bandeira\n"
            "SUDESTE;SP;SAO PAULO;POSTO 1;00.000.000/0001-00;RUA A;100;;"
            "CENTRO;01000-000;GASOLINA COMUM;01/01/2024;5,79;5,10;"
            "R$ / litro;BRANCA\n"
            "LINHA;MALFORMADA;POUCOS_CAMPOS\n"
            "SUDESTE;SP;SAO PAULO;POSTO 2;00.000.000/0002-00;RUA B;200;;"
            "CENTRO;01000-001;GASOLINA COMUM;01/02/2024;5,89;5,15;"
            "R$ / litro;BRANCA\n"
        )
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=csv_content,
            status=200,
        )
        header = csv_content.split("\n")[0] + "\n"
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=header,
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 2
        assert result[0].value == 5.79
        assert result[1].value == 5.89

    @responses.activate
    def test_raises_on_missing_columns(self):
        """Deve lançar ValueError se colunas obrigatórias ausentes."""
        bad_csv = "ColA;ColB;ColC\n1;2;3\n"
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=bad_csv,
            status=200,
        )
        header = bad_csv.split("\n")[0] + "\n"
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=header,
            status=200,
        )
        extractor = ANPExtractor()
        with pytest.raises(ValueError, match="Colunas obrigatórias ausentes"):
            extractor.extract(start_year=2024, end_year=2024)

    @responses.activate
    def test_ignores_rows_with_missing_prices(self):
        """Deve ignorar linhas com preço ausente ou inválido."""
        csv_content = (
            "Regiao - Sigla;Estado - Sigla;Municipio;Revenda;"
            "CNPJ da Revenda;Nome da Rua;Numero Rua;Complemento;"
            "Bairro;Cep;Produto;Data da Coleta;Valor de Venda;"
            "Valor de Compra;Unidade de Medida;Bandeira\n"
            "SUDESTE;SP;SAO PAULO;POSTO 1;00.000.000/0001-00;RUA A;100;;"
            "CENTRO;01000-000;GASOLINA COMUM;01/01/2024;5,79;5,10;"
            "R$ / litro;BRANCA\n"
            "SUDESTE;SP;SAO PAULO;POSTO 2;00.000.000/0002-00;RUA B;200;;"
            "CENTRO;01000-001;GASOLINA COMUM;01/01/2024;;5,15;"
            "R$ / litro;BRANCA\n"
        )
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-01.csv",
            body=csv_content,
            status=200,
        )
        header = csv_content.split("\n")[0] + "\n"
        responses.add(
            responses.GET,
            f"{BASE_URL}/ca-2024-02.csv",
            body=header,
            status=200,
        )
        extractor = ANPExtractor()
        result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 1
        assert result[0].value == 5.79
