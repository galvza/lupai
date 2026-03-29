"""Testes unitários do extrator de energia elétrica residencial (IBGE SIDRA).

Cenários cobertos:
- T070: Extrair variação mensal com resposta válida — deve retornar MonthlyDataPoint
- T071: Resposta vazia (só header) — deve retornar lista vazia
- T072: Valores inválidos ("...", "-") — deve ignorar
- T073: Formato de data YYYYMM → YYYY-MM — conversão correta
- T074: Combinação de tabelas (1419 + 7060) — deve unificar dados
- T075: Deduplicação na transição de tabelas — sem duplicatas
- T076: Erro HTTP — deve retornar lista vazia sem exceção
- T077: Filtro por ano — respeita start_year e end_year
- T078: Parse de valores positivos e negativos — preserva sinal
"""

import re
from pathlib import Path
from unittest.mock import patch

import pytest

from src.extractors.energia import (
    EnergiaExtractor,
    _build_url,
    _parse_period,
    _parse_response,
    _parse_value,
)
from src.models.indicators import MonthlyDataPoint
from tests.conftest import load_json_fixture


def _fixture(key: str) -> list[dict]:
    """Carrega fixture de resposta SIDRA."""
    data = load_json_fixture("energia_responses.json")
    return data[key]


# ==================== T070 ====================


class TestEnergiaExtractorValidResponse:
    """T070: Extrair variação mensal com resposta válida."""

    def test_returns_list_of_data_points(self):
        """Deve retornar lista de MonthlyDataPoint."""
        data = _fixture("sidra_valid")
        points = _parse_response(data)
        assert isinstance(points, list)
        assert len(points) == 3
        assert all(isinstance(p, MonthlyDataPoint) for p in points)

    def test_first_point_values(self):
        """Primeiro ponto deve ter data e valor corretos."""
        data = _fixture("sidra_valid")
        points = _parse_response(data)
        assert points[0].date == "2024-01"
        assert points[0].value == pytest.approx(0.25)

    def test_negative_value_preserved(self):
        """Valores negativos devem ser preservados."""
        data = _fixture("sidra_valid")
        points = _parse_response(data)
        assert points[1].value == pytest.approx(-1.53)

    def test_all_values_are_float(self):
        """Todos os valores devem ser float."""
        data = _fixture("sidra_valid")
        points = _parse_response(data)
        for p in points:
            assert isinstance(p.value, float)


# ==================== T071 ====================


class TestEnergiaExtractorEmptyResponse:
    """T071: Resposta vazia."""

    def test_header_only_returns_empty(self):
        """Resposta com apenas header deve retornar lista vazia."""
        data = _fixture("sidra_empty")
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


# ==================== T072 ====================


class TestEnergiaExtractorInvalidValues:
    """T072: Valores inválidos."""

    def test_dots_ignored(self):
        """Valor '...' deve ser ignorado."""
        data = _fixture("sidra_with_gaps")
        points = _parse_response(data)
        dates = [p.date for p in points]
        # 2015-02 tem "..." — deve ser ignorado
        assert "2015-02" not in dates
        assert len(points) == 2

    def test_valid_points_preserved(self):
        """Pontos válidos ao redor de gaps devem ser preservados."""
        data = _fixture("sidra_with_gaps")
        points = _parse_response(data)
        assert points[0].date == "2015-01"
        assert points[0].value == pytest.approx(0.50)
        assert points[1].date == "2015-03"
        assert points[1].value == pytest.approx(-0.38)


# ==================== T073 ====================


class TestParsePeriod:
    """T073: Conversão de código de período."""

    def test_standard_conversion(self):
        """YYYYMM deve virar YYYY-MM."""
        assert _parse_period("202401") == "2024-01"

    def test_december(self):
        """Mês 12 deve funcionar."""
        assert _parse_period("202512") == "2025-12"

    def test_january(self):
        """Mês 01 deve funcionar."""
        assert _parse_period("201201") == "2012-01"

    def test_invalid_month_returns_none(self):
        """Mês 13 deve retornar None."""
        assert _parse_period("202413") is None

    def test_invalid_month_zero_returns_none(self):
        """Mês 00 deve retornar None."""
        assert _parse_period("202400") is None

    def test_short_code_returns_none(self):
        """Código curto deve retornar None."""
        assert _parse_period("2024") is None

    def test_empty_returns_none(self):
        """String vazia deve retornar None."""
        assert _parse_period("") is None

    def test_non_numeric_returns_none(self):
        """Texto não numérico deve retornar None."""
        assert _parse_period("abcdef") is None


# ==================== T074 ====================


class TestEnergiaExtractorCombinedTables:
    """T074: Combinação de tabelas 1419 + 7060."""

    def test_combines_old_and_new_tables(self):
        """Deve unificar dados das duas tabelas."""
        old_data = _fixture("sidra_old_table")
        new_data = _fixture("sidra_new_table")

        def mock_fetch(url, **kwargs):
            if "/t/1419/" in url:
                return old_data
            if "/t/7060/" in url:
                return new_data
            return []

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            result = extractor.extract(start_year=2019, end_year=2020)

        assert len(result) == 4
        dates = [p.date for p in result]
        assert "2019-01" in dates
        assert "2019-02" in dates
        assert "2020-01" in dates
        assert "2020-02" in dates

    def test_sorted_across_tables(self):
        """Resultado combinado deve estar ordenado por data."""
        old_data = _fixture("sidra_old_table")
        new_data = _fixture("sidra_new_table")

        def mock_fetch(url, **kwargs):
            if "/t/1419/" in url:
                return old_data
            if "/t/7060/" in url:
                return new_data
            return []

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            result = extractor.extract(start_year=2019, end_year=2020)

        dates = [p.date for p in result]
        assert dates == sorted(dates)


# ==================== T075 ====================


class TestEnergiaExtractorDeduplication:
    """T075: Deduplicação na transição de tabelas."""

    def test_deduplicates_overlapping_dates(self):
        """Datas presentes em ambas as tabelas devem ser deduplicadas."""
        # Simula overlap: ambas tabelas retornam 2020-01
        overlap_old = [
            _fixture("sidra_valid")[0],  # header
            {
                "NC": "1", "NN": "Brasil", "MC": "10", "MN": "%",
                "V": "0.50",
                "D1C": "1", "D1N": "Brasil",
                "D2C": "63", "D2N": "IPCA - Variação mensal",
                "D3C": "202001", "D3N": "janeiro 2020",
                "D4C": "7484", "D4N": "2202.Energia elétrica residencial",
            },
        ]
        overlap_new = [
            _fixture("sidra_valid")[0],  # header
            {
                "NC": "1", "NN": "Brasil", "MC": "10", "MN": "%",
                "V": "0.16",
                "D1C": "1", "D1N": "Brasil",
                "D2C": "63", "D2N": "IPCA - Variação mensal",
                "D3C": "202001", "D3N": "janeiro 2020",
                "D4C": "7484", "D4N": "2202.Energia elétrica residencial",
            },
        ]

        def mock_fetch(url, **kwargs):
            if "/t/1419/" in url:
                return overlap_old
            if "/t/7060/" in url:
                return overlap_new
            return []

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            result = extractor.extract(start_year=2019, end_year=2020)

        dates = [p.date for p in result]
        assert dates.count("2020-01") == 1


# ==================== T076 ====================


class TestEnergiaExtractorHTTPErrors:
    """T076: Erro HTTP."""

    def test_returns_empty_on_connection_error(self):
        """Erro de conexão deve retornar lista vazia."""
        extractor = EnergiaExtractor()
        with patch(
            "src.extractors.energia.fetch_json",
            side_effect=ConnectionError("SIDRA offline"),
        ):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []

    def test_returns_empty_on_timeout(self):
        """Timeout deve retornar lista vazia."""
        from requests.exceptions import Timeout

        extractor = EnergiaExtractor()
        with patch(
            "src.extractors.energia.fetch_json",
            side_effect=Timeout("Request timed out"),
        ):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert result == []

    def test_partial_failure_returns_available_data(self):
        """Se uma tabela falhar, deve retornar dados da outra."""
        new_data = _fixture("sidra_new_table")

        def mock_fetch(url, **kwargs):
            if "/t/1419/" in url:
                raise ConnectionError("Old table offline")
            if "/t/7060/" in url:
                return new_data
            return []

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            result = extractor.extract(start_year=2019, end_year=2020)

        # Deve ter os dados da tabela nova mesmo com a antiga falhando
        assert len(result) == 2
        assert result[0].date == "2020-01"


# ==================== T077 ====================


class TestEnergiaExtractorYearFilter:
    """T077: Filtro por ano."""

    def test_start_year_before_2012_adjusted(self):
        """start_year antes de 2012 deve ser ajustado pra 2012."""
        valid_data = _fixture("sidra_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2005, end_year=2024)

        # Deve consultar tabela 1419 começando de 2012, não 2005
        old_call = [c for c in calls if "/t/1419/" in c]
        assert len(old_call) == 1
        assert "201201" in old_call[0]

    def test_only_new_table_when_start_after_2020(self):
        """Se start_year >= 2020, não deve consultar tabela antiga."""
        valid_data = _fixture("sidra_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2022, end_year=2024)

        tables = ["/t/1419/" if "/t/1419/" in c else "/t/7060/" for c in calls]
        assert "/t/1419/" not in tables
        assert "/t/7060/" in tables

    def test_only_old_table_when_end_before_2020(self):
        """Se end_year < 2020, não deve consultar tabela nova."""
        valid_data = _fixture("sidra_valid")
        calls = []

        def mock_fetch(url, **kwargs):
            calls.append(url)
            return valid_data

        extractor = EnergiaExtractor()
        with patch("src.extractors.energia.fetch_json", side_effect=mock_fetch):
            extractor.extract(start_year=2015, end_year=2018)

        tables = ["/t/1419/" if "/t/1419/" in c else "/t/7060/" for c in calls]
        assert "/t/1419/" in tables
        assert "/t/7060/" not in tables


# ==================== T078 ====================


class TestParseValue:
    """T078: Parse de valores."""

    def test_positive_float(self):
        """Valor positivo deve ser parseado."""
        assert _parse_value("0.25") == pytest.approx(0.25)

    def test_negative_float(self):
        """Valor negativo deve ser parseado."""
        assert _parse_value("-1.53") == pytest.approx(-1.53)

    def test_zero(self):
        """Zero deve ser parseado."""
        assert _parse_value("0.00") == pytest.approx(0.0)

    def test_dots_return_none(self):
        """'...' deve retornar None."""
        assert _parse_value("...") is None

    def test_dash_returns_none(self):
        """'-' (sem número) deve retornar None."""
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


# ==================== Helpers ====================


class TestBuildUrl:
    """Testes pra _build_url."""

    def test_builds_correct_url(self):
        """Deve construir URL com todos os parâmetros."""
        url = _build_url("7060", "202401", "202412")
        assert "/t/7060/" in url
        assert "/p/202401-202412" in url
        assert "/c315/7484" in url
        assert "/v/63" in url

    def test_old_table_url(self):
        """Deve funcionar com tabela antiga."""
        url = _build_url("1419", "201201", "201912")
        assert "/t/1419/" in url
        assert "/p/201201-201912" in url


class TestDateFormat:
    """Verifica que todas as datas estão no formato YYYY-MM."""

    def test_all_dates_match_pattern(self):
        """Todas as datas extraídas devem ser YYYY-MM."""
        data = _fixture("sidra_valid")
        points = _parse_response(data)
        for p in points:
            assert re.match(r"^\d{4}-\d{2}$", p.date), (
                f"Data fora do formato: {p.date}"
            )
