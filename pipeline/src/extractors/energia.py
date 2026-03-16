"""Extrator de dados de energia elétrica residencial via IBGE SIDRA.

Consulta a API pública do IBGE SIDRA pra extrair a variação mensal (%)
do IPCA — subitem "Energia elétrica residencial" (código 7484).

Fonte: IBGE, Sistema Nacional de Índices de Preços ao Consumidor (SNIPC).
Tabela 1419: jan/2012 a dez/2019 (classificação antiga).
Tabela 7060: jan/2020 em diante (classificação atual).
"""

import logging

from src.models.indicators import MonthlyDataPoint
from src.utils.http_client import fetch_json

logger = logging.getLogger(__name__)

SIDRA_BASE_URL = "https://apisidra.ibge.gov.br/values"

# Código do subitem "Energia elétrica residencial" na classificação 315
ENERGIA_CODE = "7484"

# Tabelas do SIDRA e seus períodos de cobertura
TABLE_OLD = "1419"  # Jan/2012 a Dez/2019
TABLE_NEW = "7060"  # Jan/2020 em diante
TABLE_TRANSITION_YEAR = 2020

# Variável 63 = IPCA variação mensal (%)
VARIABLE = "63"

SIDRA_TIMEOUT = 60


def _build_url(table: str, period_start: str, period_end: str) -> str:
    """Constrói URL da API SIDRA pra consulta de energia elétrica.

    Args:
        table: Número da tabela SIDRA ("1419" ou "7060").
        period_start: Período inicial no formato "YYYYMM".
        period_end: Período final no formato "YYYYMM".

    Returns:
        URL completa pra consulta.
    """
    return (
        f"{SIDRA_BASE_URL}/t/{table}/n1/all"
        f"/v/{VARIABLE}"
        f"/p/{period_start}-{period_end}"
        f"/c315/{ENERGIA_CODE}"
        f"/d/v{VARIABLE}%202"
    )


def _parse_period(period_code: str) -> str | None:
    """Converte código de período SIDRA (YYYYMM) pra formato YYYY-MM.

    Args:
        period_code: Código no formato "YYYYMM" (ex: "202401").

    Returns:
        Data no formato "YYYY-MM" ou None se inválido.
    """
    code = str(period_code).strip()
    if len(code) != 6:
        return None
    try:
        year = int(code[:4])
        month = int(code[4:6])
        if 1 <= month <= 12 and 2000 <= year <= 2100:
            return f"{year:04d}-{month:02d}"
    except (ValueError, TypeError):
        pass
    return None


def _parse_value(raw: str) -> float | None:
    """Converte valor string da API SIDRA pra float.

    Args:
        raw: Valor como string (ex: "0.25" ou "-1.53" ou "...").

    Returns:
        Valor float ou None se inválido.
    """
    if not raw or not isinstance(raw, str):
        return None
    cleaned = raw.strip()
    if cleaned in ("", "-", "...", "X"):
        return None
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_response(data: list[dict]) -> list[MonthlyDataPoint]:
    """Parseia resposta JSON da API SIDRA.

    A resposta é um array onde o primeiro elemento é o header
    e os demais são registros de dados. Cada registro tem:
    - D3C: código do período (YYYYMM)
    - V: valor da variação mensal (%)

    Args:
        data: Lista de dicts retornada pela API SIDRA.

    Returns:
        Lista de MonthlyDataPoint extraídos.
    """
    if not data or len(data) < 2:
        return []

    points: list[MonthlyDataPoint] = []

    # Pula o primeiro elemento (header)
    for record in data[1:]:
        period_code = record.get("D3C", "")
        raw_value = record.get("V", "")

        date = _parse_period(period_code)
        if date is None:
            logger.debug("Período inválido ignorado: %s", period_code)
            continue

        value = _parse_value(raw_value)
        if value is None:
            logger.debug("Valor inválido ignorado pra %s: %s", date, raw_value)
            continue

        points.append(MonthlyDataPoint(date=date, value=value))

    return points


class EnergiaExtractor:
    """Extrator da variação mensal do IPCA — Energia elétrica residencial.

    Consulta duas tabelas do IBGE SIDRA:
    - Tabela 1419 (2012-2019): classificação antiga do IPCA
    - Tabela 7060 (2020+): classificação atual do IPCA

    O subitem "Energia elétrica residencial" (código 7484) representa
    a variação mensal de preço da tarifa de energia residencial,
    incluindo efeitos do sistema de bandeiras tarifárias.
    """

    def __init__(self, base_url: str = SIDRA_BASE_URL) -> None:
        """Inicializa o extrator.

        Args:
            base_url: URL base da API SIDRA.
        """
        self.base_url = base_url

    def _fetch_table(
        self,
        table: str,
        start_year: int,
        end_year: int,
    ) -> list[MonthlyDataPoint]:
        """Busca dados de uma tabela SIDRA pra um intervalo de anos.

        Args:
            table: Número da tabela ("1419" ou "7060").
            start_year: Ano inicial.
            end_year: Ano final.

        Returns:
            Lista de MonthlyDataPoint extraídos.
        """
        period_start = f"{start_year:04d}01"
        period_end = f"{end_year:04d}12"

        url = _build_url(table, period_start, period_end)
        logger.info("Consultando SIDRA tabela %s (%s-%s)...", table, start_year, end_year)

        try:
            data = fetch_json(url, timeout=SIDRA_TIMEOUT)
        except Exception as exc:
            logger.warning(
                "Erro ao consultar SIDRA tabela %s: %s", table, exc
            )
            return []

        if not isinstance(data, list):
            logger.warning(
                "Resposta inesperada da SIDRA tabela %s: tipo %s",
                table,
                type(data).__name__,
            )
            return []

        points = _parse_response(data)
        logger.info(
            "SIDRA tabela %s: %d pontos extraídos", table, len(points)
        )
        return points

    def extract(
        self,
        start_year: int = 2012,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai a série de variação mensal de energia elétrica residencial.

        Combina dados de duas tabelas SIDRA pra cobrir o maior período.
        Série disponível a partir de jan/2012.

        Args:
            start_year: Ano inicial (mínimo efetivo: 2012).
            end_year: Ano final.

        Returns:
            Lista de MonthlyDataPoint com variação mensal (%).
        """
        # Ajusta start_year pro mínimo da série
        effective_start = max(start_year, 2012)

        logger.info(
            "Iniciando extração energia elétrica (%d-%d)...",
            effective_start,
            end_year,
        )

        all_points: list[MonthlyDataPoint] = []

        # Tabela antiga (1419): 2012 a 2019
        old_end = min(end_year, TABLE_TRANSITION_YEAR - 1)
        if effective_start <= old_end:
            old_points = self._fetch_table(
                TABLE_OLD, effective_start, old_end
            )
            all_points.extend(old_points)

        # Tabela nova (7060): 2020 em diante
        new_start = max(effective_start, TABLE_TRANSITION_YEAR)
        if new_start <= end_year:
            new_points = self._fetch_table(TABLE_NEW, new_start, end_year)
            all_points.extend(new_points)

        # Deduplica e ordena
        seen: dict[str, MonthlyDataPoint] = {}
        for p in all_points:
            seen[p.date] = p
        result = sorted(seen.values(), key=lambda p: p.date)

        logger.info("Energia elétrica: %d pontos extraídos no total", len(result))
        return result
