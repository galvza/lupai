"""Testes unitários do extrator FipeZAP (aluguel residencial).

Cenários cobertos:
- T060: Extrair variação mensal com Excel válido — deve retornar lista de MonthlyDataPoint
- T061: Filtrar por período de anos — deve respeitar start_year e end_year
- T062: Formato de datas — todas as datas devem estar no formato YYYY-MM
- T063: Valores numéricos — todos os valores devem ser float
- T064: Excel vazio — deve retornar lista vazia
- T065: Excel com colunas inesperadas — deve tentar fallback de colunas
- T066: Fallback pra arquivo local — deve carregar Excel local se download falhar
- T067: Nenhum dado disponível — deve retornar lista vazia sem exceção
- T068: Deduplicação — datas duplicadas devem ser deduplicadas
- T069: Parse de valor com vírgula brasileira — deve converter corretamente
"""

import io
import re
from pathlib import Path
from unittest.mock import patch

import pandas as pd
import pytest

from src.extractors.fipezap import (
    FipeZAPExtractor,
    _find_column,
    _parse_date_column,
    _parse_value,
)
from src.models.indicators import MonthlyDataPoint

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"
SAMPLE_EXCEL = FIXTURES_DIR / "fipezap_sample.xlsx"


def _create_excel_bytes(
    data: dict,
    sheet_name: str = "Sheet1",
) -> bytes:
    """Cria Excel em memória a partir de um dicionário."""
    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine="openpyxl", sheet_name=sheet_name)
    return buffer.getvalue()


def _sample_excel_bytes() -> bytes:
    """Carrega o Excel de fixture como bytes."""
    return SAMPLE_EXCEL.read_bytes()


# ==================== T060 ====================


class TestFipeZAPExtractorValidExcel:
    """T060: Extrair variação mensal com Excel válido."""

    def test_returns_list_of_data_points(self):
        """Deve retornar lista de MonthlyDataPoint."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        assert isinstance(result, list)
        assert len(result) > 0
        assert all(isinstance(p, MonthlyDataPoint) for p in result)

    def test_returns_expected_count(self):
        """Deve retornar todos os pontos do Excel de fixture."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        # A fixture tem 12 pontos entre 2008 e 2024
        assert len(result) == 12

    def test_values_are_correct(self):
        """Valores devem corresponder aos dados da fixture."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        # Primeiro ponto: 2008-01, 1.2
        assert result[0].date == "2008-01"
        assert result[0].value == pytest.approx(1.2)
        # Último ponto: 2024-08, 0.3
        assert result[-1].date == "2024-08"
        assert result[-1].value == pytest.approx(0.3)

    def test_sorted_by_date(self):
        """Resultado deve estar ordenado por data."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        dates = [p.date for p in result]
        assert dates == sorted(dates)


# ==================== T061 ====================


class TestFipeZAPFilterByYear:
    """T061: Filtrar por período de anos."""

    def test_filters_start_year(self):
        """Deve excluir dados antes do start_year."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2015, end_year=2025)
        for point in result:
            year = int(point.date[:4])
            assert year >= 2015

    def test_filters_end_year(self):
        """Deve excluir dados após o end_year."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2015)
        for point in result:
            year = int(point.date[:4])
            assert year <= 2015

    def test_single_year_filter(self):
        """Deve retornar apenas dados de um ano específico."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2024, end_year=2024)
        assert len(result) == 3  # 2024-06, 2024-07, 2024-08
        for point in result:
            assert point.date.startswith("2024")


# ==================== T062 ====================


class TestFipeZAPDateFormat:
    """T062: Formato de datas."""

    def test_dates_in_yyyy_mm_format(self):
        """Todas as datas devem estar no formato YYYY-MM."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        for point in result:
            assert re.match(r"^\d{4}-\d{2}$", point.date), (
                f"Data fora do formato YYYY-MM: {point.date}"
            )


# ==================== T063 ====================


class TestFipeZAPNumericValues:
    """T063: Valores numéricos."""

    def test_all_values_are_float(self):
        """Todos os valores devem ser do tipo float."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        for point in result:
            assert isinstance(point.value, float)

    def test_negative_values_preserved(self):
        """Valores negativos devem ser preservados."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2008)
        # Fixture tem -0.3 em 2008-03
        values = {p.date: p.value for p in result}
        assert values["2008-03"] == pytest.approx(-0.3)


# ==================== T064 ====================


class TestFipeZAPEmptyExcel:
    """T064: Excel vazio."""

    def test_empty_dataframe_returns_empty(self):
        """Excel com DataFrame vazio deve retornar lista vazia."""
        data = _create_excel_bytes({"Data": [], "Variação Mensal": []})
        extractor = FipeZAPExtractor(local_path=None)
        with patch.object(extractor, "_download_excel", return_value=data):
            result = extractor.extract(start_year=2008, end_year=2025)
        assert result == []


# ==================== T065 ====================


class TestFipeZAPFallbackColumns:
    """T065: Excel com colunas inesperadas."""

    def test_numeric_column_fallback(self):
        """Deve usar primeira coluna numérica se nome padrão não existir."""
        data = _create_excel_bytes({
            "Data": pd.to_datetime(["2020-01-01", "2020-02-01"]),
            "Coluna Estranha %": [0.5, 0.8],
        })
        extractor = FipeZAPExtractor(local_path=None)
        with patch.object(extractor, "_download_excel", return_value=data):
            result = extractor.extract(start_year=2020, end_year=2020)
        assert len(result) == 2

    def test_first_column_date_fallback(self):
        """Deve usar primeira coluna como data se nome padrão não existir."""
        data = _create_excel_bytes({
            "Período Referência": pd.to_datetime(["2020-06-01", "2020-07-01"]),
            "Variação Mensal": [1.0, 1.5],
        })
        extractor = FipeZAPExtractor(local_path=None)
        with patch.object(extractor, "_download_excel", return_value=data):
            result = extractor.extract(start_year=2020, end_year=2020)
        assert len(result) == 2


# ==================== T066 ====================


class TestFipeZAPLocalFallback:
    """T066: Fallback pra arquivo local."""

    def test_uses_local_when_download_fails(self):
        """Deve usar arquivo local se download retornar None."""
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        assert len(result) > 0

    def test_uses_downloaded_data_when_available(self):
        """Deve preferir download remoto ao arquivo local."""
        remote_data = _create_excel_bytes({
            "Data": pd.to_datetime(["2023-01-01"]),
            "Variação Mensal": [9.9],
        })
        extractor = FipeZAPExtractor(local_path=SAMPLE_EXCEL)
        with patch.object(extractor, "_download_excel", return_value=remote_data):
            result = extractor.extract(start_year=2023, end_year=2023)
        assert len(result) == 1
        assert result[0].value == pytest.approx(9.9)


# ==================== T067 ====================


class TestFipeZAPNoData:
    """T067: Nenhum dado disponível."""

    def test_no_excel_returns_empty(self):
        """Sem Excel remoto nem local deve retornar lista vazia."""
        extractor = FipeZAPExtractor(local_path=Path("/inexistente/fipezap.xlsx"))
        with patch.object(extractor, "_download_excel", return_value=None):
            result = extractor.extract(start_year=2008, end_year=2025)
        assert result == []

    def test_corrupted_excel_returns_empty(self):
        """Excel corrompido deve retornar lista vazia sem exceção."""
        extractor = FipeZAPExtractor(local_path=None)
        with patch.object(extractor, "_download_excel", return_value=b"not-an-excel"):
            result = extractor.extract(start_year=2008, end_year=2025)
        assert result == []


# ==================== T068 ====================


class TestFipeZAPDeduplication:
    """T068: Deduplicação de datas."""

    def test_duplicate_dates_deduped(self):
        """Datas duplicadas devem manter apenas o último valor."""
        data = _create_excel_bytes({
            "Data": pd.to_datetime([
                "2020-01-01", "2020-01-15", "2020-02-01",
            ]),
            "Variação Mensal": [0.5, 0.8, 1.0],
        })
        extractor = FipeZAPExtractor(local_path=None)
        with patch.object(extractor, "_download_excel", return_value=data):
            result = extractor.extract(start_year=2020, end_year=2020)
        dates = [p.date for p in result]
        # 2020-01-01 e 2020-01-15 geram mesmo "2020-01" — último prevalece
        assert dates.count("2020-01") == 1
        # Valor deve ser o último (0.8)
        jan = next(p for p in result if p.date == "2020-01")
        assert jan.value == pytest.approx(0.8)


# ==================== T069 ====================


class TestParseValue:
    """T069: Parse de valor com vírgula brasileira."""

    def test_float_passthrough(self):
        """Float deve passar direto."""
        assert _parse_value(1.5) == pytest.approx(1.5)

    def test_int_to_float(self):
        """Int deve ser convertido pra float."""
        assert _parse_value(3) == pytest.approx(3.0)

    def test_string_with_comma(self):
        """String com vírgula brasileira deve ser convertida."""
        assert _parse_value("1,23") == pytest.approx(1.23)

    def test_string_with_dot(self):
        """String com ponto decimal deve funcionar."""
        assert _parse_value("1.23") == pytest.approx(1.23)

    def test_none_returns_none(self):
        """None deve retornar None."""
        assert _parse_value(None) is None

    def test_dash_returns_none(self):
        """Traço deve retornar None."""
        assert _parse_value("-") is None

    def test_nan_returns_none(self):
        """NaN deve retornar None."""
        assert _parse_value(float("nan")) is None

    def test_empty_string_returns_none(self):
        """String vazia deve retornar None."""
        assert _parse_value("") is None


# ==================== Helpers ====================


class TestFindColumn:
    """Testes pra _find_column."""

    def test_finds_exact_match(self):
        """Deve encontrar coluna com nome exato."""
        df = pd.DataFrame({"Data": [1], "Valor": [2]})
        assert _find_column(df, ["Data"]) == "Data"

    def test_returns_none_if_not_found(self):
        """Deve retornar None se nenhum candidato encontrado."""
        df = pd.DataFrame({"X": [1], "Y": [2]})
        assert _find_column(df, ["Data", "Mês"]) is None

    def test_returns_first_match(self):
        """Deve retornar o primeiro candidato encontrado."""
        df = pd.DataFrame({"Data": [1], "Mês": [2]})
        assert _find_column(df, ["Mês", "Data"]) == "Mês"


class TestParseDateColumn:
    """Testes pra _parse_date_column."""

    def test_timestamp_conversion(self):
        """Deve converter Timestamp pra YYYY-MM."""
        series = pd.Series([pd.Timestamp("2020-06-15")])
        result = _parse_date_column(series)
        assert result.iloc[0] == "2020-06"

    def test_string_date_conversion(self):
        """Deve converter string de data pra YYYY-MM."""
        series = pd.Series(["01/06/2020"])
        result = _parse_date_column(series)
        assert result.iloc[0] == "2020-06"
