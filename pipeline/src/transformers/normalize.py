"""Normalizador de séries temporais do pipeline.

Padroniza dados vindos dos diferentes extractors: filtra período,
ordena, remove duplicatas e valida valores numéricos.
"""

import logging
import math
import re
from collections import defaultdict

from src.models.indicators import MonthlyDataPoint

logger = logging.getLogger(__name__)

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}$")


def _is_valid_date(date_str: str) -> bool:
    """Verifica se a data está no formato YYYY-MM válido.

    Args:
        date_str: String de data.

    Returns:
        True se formato válido.
    """
    if not isinstance(date_str, str) or not DATE_PATTERN.match(date_str):
        return False
    month = int(date_str[5:7])
    return 1 <= month <= 12


def _is_valid_value(value: object) -> bool:
    """Verifica se o valor é numérico válido.

    Args:
        value: Valor a validar.

    Returns:
        True se float válido (não None, não NaN, não Inf).
    """
    if value is None:
        return False
    if not isinstance(value, (int, float)):
        return False
    if math.isnan(value) or math.isinf(value):
        return False
    return True


def normalize_series(
    points: list[MonthlyDataPoint],
    start_year: int = 2005,
    end_year: int = 2025,
) -> list[MonthlyDataPoint]:
    """Normaliza uma série temporal de dados mensais.

    Aplica, em ordem: validação de formato de data, validação de valor,
    filtro por período, deduplicação (mantém último) e ordenação.

    Args:
        points: Lista de pontos de dados brutos.
        start_year: Ano inicial do período aceito.
        end_year: Ano final do período aceito.

    Returns:
        Lista normalizada de MonthlyDataPoint, ordenada por data.
    """
    valid: list[MonthlyDataPoint] = []

    for point in points:
        if not _is_valid_date(point.date):
            logger.warning("Data em formato inválido removida: '%s'", point.date)
            continue

        if not _is_valid_value(point.value):
            logger.warning("Valor inválido removido na data %s", point.date)
            continue

        year = int(point.date[:4])
        if year < start_year or year > end_year:
            continue

        valid.append(point)

    # Deduplicar: manter último valor por data
    seen: dict[str, MonthlyDataPoint] = {}
    for point in valid:
        seen[point.date] = point

    result = sorted(seen.values(), key=lambda p: p.date)

    if not result and points:
        logger.warning(
            "Série ficou vazia após normalização (%d pontos removidos)",
            len(points),
        )

    return result


def aggregate_daily_to_monthly(
    points: list[MonthlyDataPoint],
) -> list[MonthlyDataPoint]:
    """Agrega pontos com mesma data YYYY-MM em média mensal.

    Pontos já únicos por mês passam sem alteração.

    Args:
        points: Lista de pontos (pode conter múltiplos por mês).

    Returns:
        Lista de MonthlyDataPoint com um ponto por mês, ordenada.
    """
    monthly: dict[str, list[float]] = defaultdict(list)

    for point in points:
        if _is_valid_value(point.value):
            monthly[point.date].append(point.value)

    return [
        MonthlyDataPoint(
            date=date,
            value=round(sum(vals) / len(vals), 4),
        )
        for date, vals in sorted(monthly.items())
    ]
