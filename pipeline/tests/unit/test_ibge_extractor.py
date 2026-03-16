"""Testes unitários do extrator de desemprego (IBGE PNAD Contínua).

Cenários cobertos:
- T080: Extrair taxa de desocupação com resposta válida — deve retornar MonthlyDataPoint
- T081: Resposta vazia (só header) — deve retornar lista vazia
- T082: Valores inválidos ("...", "-") — deve ignorar
- T083: Conversão de trimestre pra mês central — Q1=fev, Q2=mai, Q3=ago, Q4=nov
- T084: Filtro de trimestres móveis — deve manter apenas trimestres calendário
- T085: Erro HTTP — deve retornar lista vazia sem exceção
- T086: Filtro por ano — respeita start_year e end_year
- T087: Parse de valores — positivos e variações
- T088: Deduplicação de períodos — sem duplicatas
"""

import re
from unittest.mock import patch

import pytest

from src.extractors.ibge import (
    IBGEExtractor,
    _build_url,
    _parse_quarter_period,
    _parse_response,
    _parse_value,
)
from src.models.indicators import MonthlyDataPoint
from tests.conftest import load_json_fixture


def _fixture(key: str) -> list[dict]:
    """Carrega fixture de resposta SIDRA PNAD."""
    data = load_json_fixture("ibge_desemprego_response.json")
    return data[key]


# ==================== T080 ====================


class TestIBGEExtractorValidResponse:
    """T080: Extrair taxa de desocupação com resposta válida."""

    def test_returns_list_of_data_points(self):
        """Deve retornar lista de MonthlyDataPoint."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        assert isinstance(points, list)
        assert len(points) == 4
        assert all(isinstance(p, MonthlyDataPoint) for p in points)

    def test_first_point_values(self):
        """Primeiro ponto deve ter data e valor corretos."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        # Q1 2012 (jan-fev-mar) → 2012-02
        assert points[0].date == "2012-02"
        assert points[0].value == pytest.approx(8.0)

    def test_all_four_quarters_present(self):
        """Deve extrair os 4 trimestres do ano."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        dates = [p.date for p in points]
        assert dates == ["2012-02", "2012-05", "2012-08", "2012-11"]

    def test_quarter_values(self):
        """Valores de cada trimestre devem estar corretos."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        expected = [8.0, 7.6, 7.1, 6.9]
        for p, exp in zip(points, expected):
            assert p.value == pytest.approx(exp)

    def test_all_values_are_float(self):
        """Todos os valores devem ser float."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        for p in points:
            assert isinstance(p.value, float)

    def test_multi_year_data(self):
        """Deve extrair dados de múltiplos anos."""
        data = _fixture("pnad_multi_year")
        points = _parse_response(data)
        assert len(points) == 8
        years = {p.date[:4] for p in points}
        assert years == {"2012", "2013"}


# ==================== T081 ====================


class TestIBGEExtractorEmptyResponse:
    """T081: Resposta vazia."""

    def test_header_only_returns_empty(self):
        """Resposta com apenas header deve retornar lista vazia."""
        data = _fixture("pnad_empty")
        points = _parse_response(data)
        assert points == []

    def test_empty_list_returns_empty(self):
        """Lista vazia deve retornar lista vazia."""
        points = _parse_response([])
        assert points == []

    def test_none_returns_empty(self):
        """None-like input deve retornar lista vazia."""
        points = _parse_response(None)
        assert points == []

    def test_single_element_returns_empty(self):
        """Lista com apenas 1 elemento (header) deve retornar vazia."""
        header = _fixture("pnad_valid")[0]
        points = _parse_response([header])
        assert points == []


# ==================== T082 ====================


class TestIBGEExtractorInvalidValues:
    """T082: Valores inválidos."""

    def test_dots_ignored(self):
        """Valor '...' deve ser ignorado."""
        data = _fixture("pnad_with_gaps")
        points = _parse_response(data)
        dates = [p.date for p in points]
        assert "2020-05" not in dates
        assert len(points) == 2

    def test_valid_points_preserved(self):
        """Pontos válidos ao redor de gaps devem ser preservados."""
        data = _fixture("pnad_with_gaps")
        points = _parse_response(data)
        assert points[0].date == "2020-02"
        assert points[0].value == pytest.approx(11.8)
        assert points[1].date == "2020-08"
        assert points[1].value == pytest.approx(14.4)


# ==================== T083 ====================


class TestParseQuarterPeriod:
    """T083: Conversão de trimestre pra mês central."""

    def test_q1_maps_to_february(self):
        """Q1 (jan-fev-mar, código 03) deve virar YYYY-02."""
        assert _parse_quarter_period("202403") == "2024-02"

    def test_q2_maps_to_may(self):
        """Q2 (abr-mai-jun, código 06) deve virar YYYY-05."""
        assert _parse_quarter_period("202406") == "2024-05"

    def test_q3_maps_to_august(self):
        """Q3 (jul-ago-set, código 09) deve virar YYYY-08."""
        assert _parse_quarter_period("202409") == "2024-08"

    def test_q4_maps_to_november(self):
        """Q4 (out-nov-dez, código 12) deve virar YYYY-11."""
        assert _parse_quarter_period("202412") == "2024-11"

    def test_first_available_quarter(self):
        """Primeiro trimestre disponível (2012 Q1)."""
        assert _parse_quarter_period("201203") == "2012-02"

    def test_short_code_returns_none(self):
        """Código curto deve retornar None."""
        assert _parse_quarter_period("2024") is None

    def test_empty_returns_none(self):
        """String vazia deve retornar None."""
        assert _parse_quarter_period("") is None

    def test_non_numeric_returns_none(self):
        """Texto não numérico deve retornar None."""
        assert _parse_quarter_period("abcdef") is None


# ==================== T084 ====================


class TestIBGEExtractorMovingQuarterFilter:
    """T084: Filtro de trimestres móveis."""

    def test_only_calendar_quarters_extracted(self):
        """Trimestres móveis (01, 02, 04) devem ser filtrados."""
        data = _fixture("pnad_with_moving_quarters")
        points = _parse_response(data)
        dates = [p.date for p in points]
        # Apenas 201303 (Q1) e 201306 (Q2) são trimestres calendário
        assert "2013-02" in dates
        assert "2013-05" in dates
        assert len(points) == 2

    def test_moving_quarter_01_filtered(self):
        """Trimestre móvel com código 01 deve ser ignorado."""
        assert _parse_quarter_period("201301") is None

    def test_moving_quarter_02_filtered(self):
        """Trimestre móvel com código 02 deve ser ignorado."""
        assert _parse_quarter_period("201302") is None

    def test_moving_quarter_04_filtered(self):
        """Trimestre móvel com código 04 deve ser ignorado."""
        assert _parse_quarter_period("201304") is None

    def test_moving_quarter_05_filtered(self):
        """Trimestre móvel com código 05 deve ser ignorado."""
        assert _parse_quarter_period("202005") is None

    def test_moving_quarter_07_filtered(self):
        """Trimestre móvel com código 07 deve ser ignorado."""
        assert _parse_quarter_period("202007") is None

    def test_moving_quarter_08_filtered(self):
        """Trimestre móvel com código 08 deve ser ignorado."""
        assert _parse_quarter_period("202008") is None

    def test_moving_quarter_10_filtered(self):
        """Trimestre móvel com código 10 deve ser ignorado."""
        assert _parse_quarter_period("202010") is None

    def test_moving_quarter_11_filtered(self):
        """Trimestre móvel com código 11 deve ser ignorado."""
        assert _parse_quarter_period("202011") is None


# ==================== T085 ====================


class TestIBGEExtractorHTTPErrors:
    """T085: Erro HTTP."""

    def test_returns_empty_on_connection_error(self):
        """Erro de conexão deve retornar lista vazia."""
        extractor = IBGEExtractor()
        with patch(
            "src.extractors.ibge.fetch_json",
            side_effect=ConnectionError("SIDRA offline"),
        ):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []

    def test_returns_empty_on_timeout(self):
        """Timeout deve retornar lista vazia."""
        from requests.exceptions import Timeout

        extractor = IBGEExtractor()
        with patch(
            "src.extractors.ibge.fetch_json",
            side_effect=Timeout("Request timed out"),
        ):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []

    def test_returns_empty_on_invalid_json(self):
        """Resposta não-lista deve retornar lista vazia."""
        extractor = IBGEExtractor()
        with patch(
            "src.extractors.ibge.fetch_json",
            return_value={"error": "invalid request"},
        ):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []


# ==================== T086 ====================


class TestIBGEExtractorYearFilter:
    """T086: Filtro por ano."""

    def test_start_year_before_2012_adjusted(self):
        """start_year antes de 2012 deve ser ajustado pra 2012."""
        valid_data = _fixture("pnad_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = IBGEExtractor()
        with patch("src.extractors.ibge.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2005, end_year=2024)

        assert len(calls) == 1
        assert "201201" in calls[0]

    def test_url_contains_end_year(self):
        """URL deve conter o ano final."""
        valid_data = _fixture("pnad_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = IBGEExtractor()
        with patch("src.extractors.ibge.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2020, end_year=2024)

        assert "202412" in calls[0]

    def test_url_contains_correct_table(self):
        """URL deve referenciar a tabela 6381."""
        valid_data = _fixture("pnad_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = IBGEExtractor()
        with patch("src.extractors.ibge.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2020, end_year=2024)

        assert "/t/6381/" in calls[0]


# ==================== T087 ====================


class TestParseValuePNAD:
    """T087: Parse de valores."""

    def test_positive_float(self):
        """Valor positivo deve ser parseado."""
        assert _parse_value("8.0") == pytest.approx(8.0)

    def test_decimal_value(self):
        """Valor com decimais deve ser parseado."""
        assert _parse_value("11.8") == pytest.approx(11.8)

    def test_low_value(self):
        """Valor baixo deve ser parseado."""
        assert _parse_value("5.1") == pytest.approx(5.1)

    def test_zero(self):
        """Zero deve ser parseado."""
        assert _parse_value("0.0") == pytest.approx(0.0)

    def test_dots_return_none(self):
        """'...' deve retornar None."""
        assert _parse_value("...") is None

    def test_dash_returns_none(self):
        """'-' deve retornar None."""
        assert _parse_value("-") is None

    def test_x_returns_none(self):
        """'X' deve retornar None."""
        assert _parse_value("X") is None

    def test_empty_returns_none(self):
        """String vazia deve retornar None."""
        assert _parse_value("") is None

    def test_none_returns_none(self):
        """None deve retornar None."""
        assert _parse_value(None) is None


# ==================== T088 ====================


class TestIBGEExtractorDeduplication:
    """T088: Deduplicação de períodos."""

    def test_deduplicates_same_period(self):
        """Períodos duplicados devem ser deduplicados."""
        data = [
            _fixture("pnad_valid")[0],  # header
            {
                "NC": "1", "NN": "Brasil", "MC": "2", "MN": "%",
                "V": "8.0",
                "D1C": "1", "D1N": "Brasil",
                "D2C": "4099", "D2N": "Taxa de desocupação",
                "D3C": "201203", "D3N": "jan-fev-mar 2012",
            },
            {
                "NC": "1", "NN": "Brasil", "MC": "2", "MN": "%",
                "V": "8.5",
                "D1C": "1", "D1N": "Brasil",
                "D2C": "4099", "D2N": "Taxa de desocupação",
                "D3C": "201203", "D3N": "jan-fev-mar 2012",
            },
        ]

        extractor = IBGEExtractor()
        with patch("src.extractors.ibge.fetch_json", return_value=data):
            result = extractor.extract(start_year=2012, end_year=2012)

        dates = [p.date for p in result]
        assert dates.count("2012-02") == 1

    def test_result_is_sorted(self):
        """Resultado deve estar ordenado por data."""
        valid_data = _fixture("pnad_multi_year")

        extractor = IBGEExtractor()
        with patch("src.extractors.ibge.fetch_json", return_value=valid_data):
            result = extractor.extract(start_year=2012, end_year=2013)

        dates = [p.date for p in result]
        assert dates == sorted(dates)


# ==================== Helpers ====================


class TestBuildUrlPNAD:
    """Testes pra _build_url."""

    def test_builds_correct_url(self):
        """Deve construir URL com todos os parâmetros."""
        url = _build_url("201201", "202412")
        assert "/t/6381/" in url
        assert "/p/201201-202412" in url
        assert "/v/4099" in url
        assert "v4099" in url

    def test_single_year_url(self):
        """Deve funcionar com período de um ano."""
        url = _build_url("202401", "202412")
        assert "/p/202401-202412" in url


class TestDateFormat:
    """Verifica que todas as datas estão no formato YYYY-MM."""

    def test_all_dates_match_pattern(self):
        """Todas as datas extraídas devem ser YYYY-MM."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        for p in points:
            assert re.match(r"^\d{4}-\d{2}$", p.date), (
                f"Data fora do formato: {p.date}"
            )

    def test_months_are_middle_of_quarter(self):
        """Meses devem ser os centrais dos trimestres (02, 05, 08, 11)."""
        data = _fixture("pnad_valid")
        points = _parse_response(data)
        valid_months = {"02", "05", "08", "11"}
        for p in points:
            month = p.date[5:]
            assert month in valid_months, (
                f"Mês {month} não é mês central de trimestre"
            )
