"""Extrator de dados da API SGS do Banco Central do Brasil.

Consulta a API pública do BCB pra extrair séries temporais de
7 indicadores econômicos: Selic, IPCA, Dólar, Salário Mínimo,
Endividamento das Famílias, Inadimplência e PIB trimestral.
"""

import logging
from collections import defaultdict

from src.models.indicators import MonthlyDataPoint
from src.utils.date_utils import date_range_chunks, format_bcb_date, parse_bcb_date
from src.utils.http_client import fetch_json

logger = logging.getLogger(__name__)

BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"

SERIES: dict[str, int] = {
    "selic": 432,
    "ipca": 13522,
    "dolar": 3698,
    "salario_minimo": 1619,
    "endividamento": 29037,  # Endividamento das famílias (% da renda)
    "inadimplencia": 21082,  # Inadimplência da carteira de crédito (%)
    "pib": 22109,  # PIB trimestral - var. % contra trimestre anterior (ajuste sazonal)
}

DAILY_SERIES = {"dolar"}


def _parse_value(raw: str) -> float | None:
    """Converte valor string da API do BCB pra float.

    Args:
        raw: Valor como string (ex: "11.75" ou "4,85").

    Returns:
        Valor float ou None se inválido.
    """
    if not raw or not raw.strip():
        return None
    try:
        cleaned = raw.strip().replace(",", ".")
        return float(cleaned)
    except (ValueError, AttributeError):
        return None


def _parse_record(record: dict) -> tuple[str, float] | None:
    """Parseia um registro da API do BCB.

    Args:
        record: Dicionário com chaves "data" e "valor".

    Returns:
        Tupla (date_yyyy_mm, value) ou None se inválido.
    """
    raw_date = record.get("data")
    raw_value = record.get("valor")

    if not raw_date or raw_value is None:
        return None

    try:
        date_str = parse_bcb_date(raw_date)
    except ValueError:
        logger.warning("Data inválida ignorada: '%s'", raw_date)
        return None

    value = _parse_value(str(raw_value))
    if value is None:
        logger.warning("Valor inválido ignorado: '%s' na data %s", raw_value, raw_date)
        return None

    return date_str, value


def _aggregate_daily_to_monthly(
    records: list[tuple[str, float]],
) -> list[MonthlyDataPoint]:
    """Agrega dados diários em média mensal.

    Args:
        records: Lista de tuplas (date_yyyy_mm, value) onde
                 múltiplos registros podem ter a mesma data YYYY-MM.

    Returns:
        Lista de MonthlyDataPoint com média por mês, ordenada por data.
    """
    monthly: dict[str, list[float]] = defaultdict(list)
    for date_str, value in records:
        monthly[date_str].append(value)

    points = [
        MonthlyDataPoint(date=date, value=round(sum(vals) / len(vals), 4))
        for date, vals in sorted(monthly.items())
    ]
    return points


def _deduplicate(records: list[tuple[str, float]]) -> list[MonthlyDataPoint]:
    """Remove duplicatas por data, mantendo o último valor.

    Args:
        records: Lista de tuplas (date_yyyy_mm, value).

    Returns:
        Lista de MonthlyDataPoint sem duplicatas, ordenada por data.
    """
    seen: dict[str, float] = {}
    for date_str, value in records:
        seen[date_str] = value

    return [
        MonthlyDataPoint(date=date, value=value)
        for date, value in sorted(seen.items())
    ]


class BCBExtractor:
    """Extrator de séries temporais da API SGS do Banco Central.

    Attributes:
        base_url: URL base da API SGS.
    """

    def __init__(self, base_url: str = BASE_URL) -> None:
        """Inicializa o extrator.

        Args:
            base_url: URL base da API SGS (permite override pra testes).
        """
        self.base_url = base_url

    def _build_url(self, series_code: int) -> str:
        """Constrói URL da API pra uma série específica.

        Args:
            series_code: Código da série no SGS.

        Returns:
            URL completa do endpoint.
        """
        return f"{self.base_url}.{series_code}/dados"

    def _fetch_chunk(
        self,
        series_code: int,
        start_year: int,
        end_year: int,
    ) -> list[dict]:
        """Busca um chunk de dados de uma série.

        A URL é montada manualmente (sem params dict) porque a API do BCB
        rejeita barras URL-encoded (%2F) nos parâmetros de data.

        Args:
            series_code: Código da série no SGS.
            start_year: Ano inicial.
            end_year: Ano final.

        Returns:
            Lista de registros da API.
        """
        base = self._build_url(series_code)
        data_inicial = format_bcb_date(start_year, 1, 1)
        data_final = format_bcb_date(end_year, 12, 31)
        url = f"{base}?formato=json&dataInicial={data_inicial}&dataFinal={data_final}"
        logger.info(
            "Buscando série %d de %d a %d...", series_code, start_year, end_year
        )
        result = fetch_json(url)
        if isinstance(result, list):
            return result
        return []

    def extract(
        self,
        indicator: str,
        start_year: int = 2005,
        end_year: int = 2025,
    ) -> list[MonthlyDataPoint]:
        """Extrai série temporal de um indicador do BCB.

        Args:
            indicator: Nome do indicador ("selic", "ipca", "dolar", "salario_minimo").
            start_year: Ano inicial da extração.
            end_year: Ano final da extração.

        Returns:
            Lista de MonthlyDataPoint ordenada por data.

        Raises:
            ValueError: Se o indicador não for reconhecido.
        """
        if indicator not in SERIES:
            raise ValueError(
                f"Indicador desconhecido: '{indicator}'. "
                f"Válidos: {list(SERIES.keys())}"
            )

        series_code = SERIES[indicator]
        chunks = date_range_chunks(start_year, end_year)

        all_records: list[tuple[str, float]] = []

        for chunk_start, chunk_end in chunks:
            raw_data = self._fetch_chunk(series_code, chunk_start, chunk_end)
            for record in raw_data:
                parsed = _parse_record(record)
                if parsed is not None:
                    all_records.append(parsed)

        if not all_records:
            logger.warning("Nenhum dado válido encontrado pra %s", indicator)
            return []

        if indicator in DAILY_SERIES:
            return _aggregate_daily_to_monthly(all_records)

        return _deduplicate(all_records)

    def extract_all(
        self,
        start_year: int = 2005,
        end_year: int = 2025,
    ) -> dict[str, list[MonthlyDataPoint]]:
        """Extrai todos os 7 indicadores do BCB.

        Args:
            start_year: Ano inicial da extração.
            end_year: Ano final da extração.

        Returns:
            Dicionário mapeando nome do indicador à lista de MonthlyDataPoint.
        """
        results: dict[str, list[MonthlyDataPoint]] = {}
        for indicator in SERIES:
            logger.info("Extraindo %s...", indicator)
            results[indicator] = self.extract(indicator, start_year, end_year)
        return results
