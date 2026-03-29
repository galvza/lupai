"""Testes unitários do normalizador de dados (transformers/normalize.py).

Cenários cobertos:
- T040: Normalizar série com datas em formato correto — deve manter YYYY-MM
- T041: Normalizar série com valores numéricos válidos — tipos corretos no output
- T042: Rejeitar série com datas fora do período 2005-2025 — deve filtrar datas fora do range
- T043: Ordenar série por data crescente — output deve estar em ordem cronológica
- T044: Remover pontos duplicados por data — deve manter apenas o último valor por data
- T045: Tratar valores nulos/None — deve remover pontos sem valor
- T046: Validar que séries não estão vazias após normalização — deve alertar se ficou vazia
- T047: Padronizar granularidade mensal — séries diárias devem ser agregadas pra mensal
"""

import logging
import math

import pytest

from src.models.indicators import MonthlyDataPoint
from src.transformers.normalize import (
    aggregate_daily_to_monthly,
    normalize_series,
)


def _p(date: str, value: float) -> MonthlyDataPoint:
    """Helper: cria MonthlyDataPoint."""
    return MonthlyDataPoint(date=date, value=value)


class TestNormalizerDateFormat:
    """T040: Normalizar datas no formato correto."""

    def test_keeps_yyyy_mm_format(self):
        """Datas já em YYYY-MM devem ser mantidas."""
        points = [_p("2024-01", 10.0), _p("2024-06", 11.0)]
        result = normalize_series(points, 2024, 2025)
        assert len(result) == 2
        assert result[0].date == "2024-01"
        assert result[1].date == "2024-06"

    def test_rejects_invalid_date_format(self):
        """Datas em formato inválido devem ser rejeitadas."""
        points = [
            _p("01/01/2024", 10.0),  # Formato dd/mm/yyyy
            _p("2024-13", 11.0),  # Mês inválido
            _p("invalid", 12.0),  # Texto aleatório
            _p("2024-01", 13.0),  # Válido
        ]
        result = normalize_series(points, 2024, 2025)
        assert len(result) == 1
        assert result[0].date == "2024-01"
        assert result[0].value == 13.0


class TestNormalizerNumericValues:
    """T041: Normalizar valores numéricos."""

    def test_values_are_floats(self):
        """Todos os valores no output devem ser float."""
        points = [_p("2024-01", 10.5), _p("2024-02", 11)]
        result = normalize_series(points, 2024, 2025)
        for point in result:
            assert isinstance(point.value, (int, float))

    def test_preserves_decimal_precision(self):
        """Precisão decimal deve ser preservada."""
        points = [_p("2024-01", 10.1234), _p("2024-02", 5.6789)]
        result = normalize_series(points, 2024, 2025)
        assert result[0].value == 10.1234
        assert result[1].value == 5.6789


class TestNormalizerDateRange:
    """T042: Filtrar datas fora do período."""

    def test_excludes_dates_before_start(self):
        """Datas anteriores ao start_year devem ser removidas."""
        points = [
            _p("2004-12", 10.0),
            _p("2005-01", 11.0),
            _p("2005-06", 12.0),
        ]
        result = normalize_series(points, 2005, 2025)
        assert len(result) == 2
        assert result[0].date == "2005-01"

    def test_excludes_dates_after_end(self):
        """Datas posteriores ao end_year devem ser removidas."""
        points = [
            _p("2025-11", 10.0),
            _p("2025-12", 11.0),
            _p("2026-01", 12.0),
        ]
        result = normalize_series(points, 2005, 2025)
        assert len(result) == 2
        assert result[-1].date == "2025-12"

    def test_keeps_dates_in_range(self):
        """Datas dentro do range devem ser mantidas."""
        points = [_p("2010-06", 10.0), _p("2020-03", 11.0)]
        result = normalize_series(points, 2005, 2025)
        assert len(result) == 2


class TestNormalizerSorting:
    """T043: Ordenar série por data crescente."""

    def test_sorts_chronologically(self):
        """Output deve estar em ordem cronológica crescente."""
        points = [
            _p("2024-06", 10.0),
            _p("2024-01", 11.0),
            _p("2024-03", 12.0),
        ]
        result = normalize_series(points, 2024, 2025)
        dates = [p.date for p in result]
        assert dates == ["2024-01", "2024-03", "2024-06"]

    def test_handles_already_sorted(self):
        """Série já ordenada deve permanecer igual."""
        points = [_p("2024-01", 10.0), _p("2024-02", 11.0), _p("2024-03", 12.0)]
        result = normalize_series(points, 2024, 2025)
        assert [p.value for p in result] == [10.0, 11.0, 12.0]


class TestNormalizerDeduplication:
    """T044: Remover pontos duplicados por data."""

    def test_removes_duplicate_dates(self):
        """Deve manter apenas um valor por data."""
        points = [
            _p("2024-01", 10.0),
            _p("2024-01", 11.0),
            _p("2024-02", 12.0),
        ]
        result = normalize_series(points, 2024, 2025)
        dates = [p.date for p in result]
        assert len(dates) == len(set(dates))
        assert len(result) == 2

    def test_keeps_last_value_on_duplicate(self):
        """Em caso de duplicata, deve manter o último valor."""
        points = [
            _p("2024-01", 10.0),
            _p("2024-01", 11.0),
        ]
        result = normalize_series(points, 2024, 2025)
        assert result[0].value == 11.0


class TestNormalizerNullValues:
    """T045: Tratar valores nulos/None."""

    def test_removes_null_values(self):
        """Pontos com valor None devem ser removidos."""
        points = [
            _p("2024-01", 10.0),
            MonthlyDataPoint(date="2024-02", value=None),  # type: ignore[arg-type]
            _p("2024-03", 12.0),
        ]
        result = normalize_series(points, 2024, 2025)
        assert len(result) == 2
        assert result[0].date == "2024-01"
        assert result[1].date == "2024-03"

    def test_removes_nan_values(self):
        """Pontos com valor NaN devem ser removidos."""
        points = [
            _p("2024-01", 10.0),
            _p("2024-02", float("nan")),
            _p("2024-03", 12.0),
        ]
        result = normalize_series(points, 2024, 2025)
        assert len(result) == 2
        assert not any(math.isnan(p.value) for p in result)


class TestNormalizerEmptyValidation:
    """T046: Validar que séries não ficaram vazias."""

    def test_warns_on_empty_series(self, caplog):
        """Deve emitir alerta quando série fica vazia após normalização."""
        points = [_p("2030-01", 10.0)]  # Fora do range
        with caplog.at_level(logging.WARNING):
            result = normalize_series(points, 2005, 2025)
        assert result == []
        assert "vazia" in caplog.text.lower()

    def test_no_warning_on_genuinely_empty_input(self, caplog):
        """Não deve alertar se a entrada já era vazia."""
        with caplog.at_level(logging.WARNING):
            result = normalize_series([], 2005, 2025)
        assert result == []
        assert "vazia" not in caplog.text.lower()


class TestNormalizerMonthlyGranularity:
    """T047: Padronizar granularidade mensal."""

    def test_aggregates_daily_to_monthly(self):
        """Dados diários devem ser agregados pra média mensal."""
        points = [
            _p("2024-01", 10.0),
            _p("2024-01", 12.0),
            _p("2024-01", 14.0),
            _p("2024-02", 20.0),
            _p("2024-02", 22.0),
        ]
        result = aggregate_daily_to_monthly(points)
        assert len(result) == 2
        assert result[0].date == "2024-01"
        assert result[0].value == 12.0  # (10+12+14)/3
        assert result[1].date == "2024-02"
        assert result[1].value == 21.0  # (20+22)/2

    def test_monthly_data_unchanged(self):
        """Dados já mensais devem permanecer iguais."""
        points = [_p("2024-01", 10.0), _p("2024-02", 11.0)]
        result = aggregate_daily_to_monthly(points)
        assert len(result) == 2
        assert result[0].value == 10.0
        assert result[1].value == 11.0

    def test_sorted_output(self):
        """Output deve estar ordenado por data."""
        points = [_p("2024-03", 30.0), _p("2024-01", 10.0), _p("2024-02", 20.0)]
        result = aggregate_daily_to_monthly(points)
        dates = [p.date for p in result]
        assert dates == sorted(dates)
