"""Exportador de dados pra JSON estático pro dashboard.

Gera os 3 arquivos JSON consumidos pelo Next.js em build time:
indicators.json, governments.json e metadata.json.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from src.models.indicators import MonthlyDataPoint, SourceStatus

logger = logging.getLogger(__name__)

# Mapeamento snake_case Python → camelCase do JSON do dashboard
KEY_MAP: dict[str, str] = {
    "salario_minimo": "salarioMinimo",
    "cesta_basica": "cestaBasica",
    "energia_eletrica": "energiaEletrica",
}

# Metadados estáticos por indicador (chaves já em camelCase)
INDICATOR_META: dict[str, dict[str, str]] = {
    "selic": {
        "label": "Taxa Selic",
        "shortLabel": "Selic",
        "unit": "% a.a.",
        "source": "bcb",
        "description": "Taxa básica de juros da economia brasileira",
        "color": "#2563EB",
        "frequency": "mensal",
    },
    "ipca": {
        "label": "IPCA acumulado 12 meses",
        "shortLabel": "IPCA",
        "unit": "%",
        "source": "bcb",
        "description": (
            "Índice Nacional de Preços ao Consumidor Amplo "
            "acumulado em 12 meses"
        ),
        "color": "#DC2626",
        "frequency": "mensal",
    },
    "dolar": {
        "label": "Dólar comercial",
        "shortLabel": "Dólar",
        "unit": "R$/USD",
        "source": "bcb",
        "description": "Cotação média mensal do dólar comercial (compra)",
        "color": "#16A34A",
        "frequency": "mensal",
    },
    "salarioMinimo": {
        "label": "Salário mínimo",
        "shortLabel": "Sal. Mínimo",
        "unit": "R$",
        "source": "bcb",
        "description": "Valor do salário mínimo nacional vigente",
        "color": "#9333EA",
        "frequency": "mensal",
    },
    "cestaBasica": {
        "label": "Cesta básica (São Paulo)",
        "shortLabel": "Cesta Básica",
        "unit": "R$",
        "source": "dieese",
        "description": "Custo da cesta básica de alimentos em São Paulo",
        "color": "#EA580C",
        "frequency": "mensal",
    },
    "gasolina": {
        "label": "Gasolina comum",
        "shortLabel": "Gasolina",
        "unit": "R$/litro",
        "source": "anp",
        "description": "Preço médio nacional da gasolina comum",
        "color": "#0891B2",
        "frequency": "mensal",
    },
    "endividamento": {
        "label": "Endividamento das famílias",
        "shortLabel": "Endividamento",
        "unit": "% da renda",
        "source": "bcb",
        "description": (
            "Percentual da renda familiar comprometida com dívidas "
            "no Sistema Financeiro Nacional"
        ),
        "color": "#534AB7",
        "frequency": "mensal",
    },
    "inadimplencia": {
        "label": "Inadimplência",
        "shortLabel": "Inadimplência",
        "unit": "%",
        "source": "bcb",
        "description": (
            "Percentual da carteira de crédito com atraso "
            "superior a 90 dias"
        ),
        "color": "#D85A30",
        "frequency": "mensal",
    },
    "energiaEletrica": {
        "label": "Energia elétrica residencial",
        "shortLabel": "Energia",
        "unit": "% var. mensal",
        "source": "ibge",
        "description": (
            "Variação mensal do IPCA — subitem energia elétrica "
            "residencial (inclui bandeiras tarifárias)"
        ),
        "color": "#EAB308",
        "frequency": "mensal",
    },
    "aluguel": {
        "label": "Aluguel (FipeZAP)",
        "shortLabel": "Aluguel",
        "unit": "% var. mensal",
        "source": "fipezap",
        "description": (
            "Variação mensal do Índice FipeZAP de locação "
            "residencial em São Paulo"
        ),
        "color": "#F59E0B",
        "frequency": "mensal",
    },
    "desemprego": {
        "label": "Taxa de desemprego",
        "shortLabel": "Desemprego",
        "unit": "%",
        "source": "pnad",
        "description": (
            "Taxa de desocupação trimestral da PNAD Contínua "
            "(pessoas de 14 anos ou mais)"
        ),
        "color": "#7C3AED",
        "frequency": "trimestral",
    },
    "pib": {
        "label": "PIB trimestral",
        "shortLabel": "PIB",
        "unit": "% var. trimestral",
        "source": "bcb",
        "description": (
            "Variação percentual do PIB contra o trimestre "
            "imediatamente anterior, com ajuste sazonal"
        ),
        "color": "#059669",
        "frequency": "trimestral",
    },
}

GOVERNMENT_PERIODS: list[dict[str, str]] = [
    {
        "id": "lula1",
        "name": "Lula 1",
        "president": "Luiz Inácio Lula da Silva",
        "start": "2003-01",
        "end": "2006-12",
        "color": "#E3342F",
    },
    {
        "id": "lula2",
        "name": "Lula 2",
        "president": "Luiz Inácio Lula da Silva",
        "start": "2007-01",
        "end": "2010-12",
        "color": "#E3342F",
    },
    {
        "id": "dilma1",
        "name": "Dilma 1",
        "president": "Dilma Rousseff",
        "start": "2011-01",
        "end": "2014-12",
        "color": "#CC1F1A",
    },
    {
        "id": "dilma2",
        "name": "Dilma 2",
        "president": "Dilma Rousseff",
        "start": "2015-01",
        "end": "2016-08",
        "color": "#CC1F1A",
    },
    {
        "id": "temer",
        "name": "Temer",
        "president": "Michel Temer",
        "start": "2016-09",
        "end": "2018-12",
        "color": "#3490DC",
    },
    {
        "id": "bolsonaro",
        "name": "Bolsonaro",
        "president": "Jair Bolsonaro",
        "start": "2019-01",
        "end": "2022-12",
        "color": "#FFED4A",
    },
    {
        "id": "lula3",
        "name": "Lula 3",
        "president": "Luiz Inácio Lula da Silva",
        "start": "2023-01",
        "end": "2026-12",
        "color": "#E3342F",
    },
]


def _to_json_key(key: str) -> str:
    """Converte chave Python snake_case pra camelCase do JSON.

    Args:
        key: Chave no formato snake_case.

    Returns:
        Chave convertida pra camelCase.
    """
    return KEY_MAP.get(key, key)


def _now_iso() -> str:
    """Retorna timestamp atual em ISO 8601 UTC.

    Returns:
        Timestamp no formato "YYYY-MM-DDTHH:MM:SSZ".
    """
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ensure_dir(output_dir: str) -> Path:
    """Cria diretório de saída se não existir.

    Args:
        output_dir: Caminho do diretório.

    Returns:
        Objeto Path do diretório.
    """
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _points_to_dicts(points: list[MonthlyDataPoint]) -> list[dict]:
    """Converte lista de MonthlyDataPoint pra lista de dicts serializáveis.

    Args:
        points: Lista de pontos de dados.

    Returns:
        Lista de dicts com chaves "date" e "value".
    """
    return [{"date": p.date, "value": p.value} for p in points]


def export_indicators(
    indicators: dict[str, list[MonthlyDataPoint]],
    output_dir: str,
) -> str:
    """Exporta indicators.json com dados de todos os indicadores.

    Args:
        indicators: Dict mapeando nome do indicador à lista de pontos.
        output_dir: Diretório de saída.

    Returns:
        Caminho absoluto do arquivo gerado.
    """
    dir_path = _ensure_dir(output_dir)

    indicators_data: dict[str, list[dict]] = {}
    all_dates: list[str] = []

    for key, points in indicators.items():
        json_key = _to_json_key(key)
        indicators_data[json_key] = _points_to_dicts(points)
        all_dates.extend(p.date for p in points)

    start = min(all_dates) if all_dates else "2005-01"
    end = max(all_dates) if all_dates else "2025-12"

    data = {
        "lastUpdated": _now_iso(),
        "period": {"start": start, "end": end},
        "indicators": indicators_data,
    }

    filepath = dir_path / "indicators.json"
    filepath.write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )
    logger.info("indicators.json exportado em %s", filepath)
    return str(filepath.resolve())


def export_governments(output_dir: str) -> str:
    """Exporta governments.json com os 7 períodos de governo.

    Args:
        output_dir: Diretório de saída.

    Returns:
        Caminho absoluto do arquivo gerado.
    """
    dir_path = _ensure_dir(output_dir)

    data = {"governments": GOVERNMENT_PERIODS}

    filepath = dir_path / "governments.json"
    filepath.write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )
    logger.info("governments.json exportado em %s", filepath)
    return str(filepath.resolve())


def export_metadata(
    indicators: dict[str, list[MonthlyDataPoint]],
    sources_status: list[SourceStatus],
    output_dir: str,
) -> str:
    """Exporta metadata.json com informações sobre fontes e indicadores.

    Args:
        indicators: Dict mapeando nome do indicador à lista de pontos.
        sources_status: Lista de status das fontes de dados.
        output_dir: Diretório de saída.

    Returns:
        Caminho absoluto do arquivo gerado.
    """
    dir_path = _ensure_dir(output_dir)

    sources = [
        {
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "lastFetch": s.last_fetch,
            "status": s.status,
        }
        for s in sources_status
    ]

    indicators_meta: dict[str, dict] = {}
    for key, points in indicators.items():
        json_key = _to_json_key(key)
        meta = dict(INDICATOR_META.get(json_key, {}))
        meta["totalPoints"] = len(points)
        if points:
            meta["latestValue"] = points[-1].value
            meta["latestDate"] = points[-1].date
        else:
            meta["latestValue"] = 0
            meta["latestDate"] = ""
        indicators_meta[json_key] = meta

    data = {
        "lastUpdated": _now_iso(),
        "sources": sources,
        "indicatorsMeta": indicators_meta,
    }

    filepath = dir_path / "metadata.json"
    filepath.write_text(
        json.dumps(data, ensure_ascii=False), encoding="utf-8"
    )
    logger.info("metadata.json exportado em %s", filepath)
    return str(filepath.resolve())
