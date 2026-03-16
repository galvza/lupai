"""Extrator da taxa de desocupação (desemprego) via IBGE PNAD Contínua.

Consulta a API pública do IBGE SIDRA — Tabela 6381 — pra extrair a
taxa de desocupação trimestral (%) no Brasil.

Fonte: IBGE, Pesquisa Nacional por Amostra de Domicílios Contínua.
Dados disponíveis a partir do 1º trimestre de 2012.

Periodicidade: trimestral (trimestre móvel). O extrator filtra apenas
os trimestres calendário (Q1-Q4) e usa o mês central de cada trimestre
como data de referência:
  Q1 (jan-fev-mar) → fev (YYYY-02)
  Q2 (abr-mai-jun) → mai (YYYY-05)
  Q3 (jul-ago-set) → ago (YYYY-08)
  Q4 (out-nov-dez) → nov (YYYY-11)
"""

import logging

from src.models.indicators import MonthlyDataPoint
from src.utils.http_client import fetch_json

logger = logging.getLogger(__name__)

PNAD_BASE_URL = "https://apisidra.ibge.gov.br/values"

# Tabela 6381: Taxa de desocupação — PNAD Contínua trimestral
TABLE_PNAD = "6381"

# Variável 4099: Taxa de desocupação (%)
VARIABLE_DESOCUPACAO = "4099"

SIDRA_TIMEOUT = 60

# Meses finais dos trimestres calendário e seus meses centrais
CALENDAR_QUARTER_MAP: dict[str, str] = {
    "03": "02",  # Q1 jan-fev-mar → fev
    "06": "05",  # Q2 abr-mai-jun → mai
    "09": "08",  # Q3 jul-ago-set → ago
    "12": "11",  # Q4 out-nov-dez → nov
}


def _build_url(start_period: str, end_period: str) -> str:
    """Constrói URL da API SIDRA pra consulta de desemprego.

    Args:
        start_period: Período inicial no formato "YYYYMM".
        end_period: Período final no formato "YYYYMM".

    Returns:
        URL completa pra consulta.
    """
    return (
        f"{PNAD_BASE_URL}/t/{TABLE_PNAD}/n1/all"
        f"/v/{VARIABLE_DESOCUPACAO}"
        f"/p/{start_period}-{end_period}"
        f"/d/v{VARIABLE_DESOCUPACAO}%201"
    )


def _parse_quarter_period(period_code: str) -> str | None:
    """Converte código de trimestre SIDRA pra YYYY-MM do mês central.

    Apenas trimestres calendário são aceitos (D3C terminando em 03, 06, 09, 12).
    Trimestres móveis (ex: 01, 02, 04, etc.) são ignorados.

    Args:
        period_code: Código no formato "YYYYMM" (ex: "201203").

    Returns:
        Data no formato "YYYY-MM" com mês central, ou None se inválido.
    """
    code = str(period_code).strip()
    if len(code) != 6:
        return None
    try:
        year_str = code[:4]
        month_str = code[4:6]
        year = int(year_str)
        if not (2000 <= year <= 2100):
            return None
        middle_month = CALENDAR_QUARTER_MAP.get(month_str)
        if middle_month is None:
            return None
        return f"{year:04d}-{middle_month}"
    except (ValueError, TypeError):
        return None


def _parse_value(raw: str) -> float | None:
    """Converte valor string da API SIDRA pra float.

    Args:
        raw: Valor como string (ex: "8.0" ou "..." ou "-").

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
    """Parseia resposta JSON da API SIDRA (tabela 6381).

    A resposta é um array onde o primeiro elemento é o header
    e os demais são registros de dados. Cada registro tem:
    - D3C: código do período (YYYYMM, mês final do trimestre)
    - V: valor da taxa de desocupação (%)

    Apenas trimestres calendário são extraídos.

    Args:
        data: Lista de dicts retornada pela API SIDRA.

    Returns:
        Lista de MonthlyDataPoint extraídos.
    """
    if not data or len(data) < 2:
        return []

    points: list[MonthlyDataPoint] = []

    for record in data[1:]:
        period_code = record.get("D3C", "")
        raw_value = record.get("V", "")

        date = _parse_quarter_period(period_code)
        if date is None:
            logger.debug("Período ignorado (não é trimestre calendário): %s", period_code)
            continue

        value = _parse_value(raw_value)
        if value is None:
            logger.debug("Valor inválido ignorado pra %s: %s", date, raw_value)
            continue

        points.append(MonthlyDataPoint(date=date, value=value))

    return points


class IBGEExtractor:
    """Extrator da taxa de desocupação via IBGE PNAD Contínua.

    Consulta a API SIDRA tabela 6381 (taxa de desocupação trimestral)
    e retorna pontos com o mês central de cada trimestre calendário.
    Dados disponíveis a partir de 2012.
    """

    def __init__(self, base_url: str = PNAD_BASE_URL) -> None:
        """Inicializa o extrator.

        Args:
            base_url: URL base da API SIDRA.
        """
        self.base_url = base_url

    def extract(
        self,
        start_year: int = 2012,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai a taxa de desocupação trimestral.

        Dados disponíveis a partir de 2012 (PNAD Contínua).

        Args:
            start_year: Ano inicial (mínimo efetivo: 2012).
            end_year: Ano final.

        Returns:
            Lista de MonthlyDataPoint com taxa de desocupação (%).
        """
        effective_start = max(start_year, 2012)

        logger.info(
            "Iniciando extração desemprego PNAD (%d-%d)...",
            effective_start,
            end_year,
        )

        start_period = f"{effective_start:04d}01"
        end_period = f"{end_year:04d}12"

        url = _build_url(start_period, end_period)

        try:
            data = fetch_json(url, timeout=SIDRA_TIMEOUT)
        except Exception as exc:
            logger.warning("Erro ao consultar SIDRA tabela %s: %s", TABLE_PNAD, exc)
            return []

        if not isinstance(data, list):
            logger.warning(
                "Resposta inesperada da SIDRA tabela %s: tipo %s",
                TABLE_PNAD,
                type(data).__name__,
            )
            return []

        points = _parse_response(data)

        # Deduplica e ordena
        seen: dict[str, MonthlyDataPoint] = {}
        for p in points:
            seen[p.date] = p
        result = sorted(seen.values(), key=lambda p: p.date)

        logger.info("Desemprego PNAD: %d pontos extraídos", len(result))
        return result
