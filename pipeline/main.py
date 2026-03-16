"""Entrypoint do pipeline de coleta e transformação de dados econômicos.

Orquestra extração → normalização → exportação de 12 indicadores:
- BCB: selic, ipca, dolar, salario_minimo, endividamento, inadimplencia, pib
- DIEESE: cesta_basica
- ANP: gasolina
- FIPE: aluguel
- IBGE/SIDRA: energia_eletrica
- IBGE/PNAD: desemprego
"""

import argparse
import logging
import sys
import time
from datetime import datetime, timezone

from src.extractors.anp import ANPExtractor
from src.extractors.anp import BASE_URL as ANP_URL
from src.extractors.bcb import BCBExtractor
from src.extractors.bcb import BASE_URL as BCB_URL
from src.extractors.dieese import DIEESEExtractor
from src.extractors.dieese import URL as DIEESE_URL
from src.extractors.energia import SIDRA_BASE_URL, EnergiaExtractor
from src.extractors.fipezap import FIPEZAP_URL, FipeZAPExtractor
from src.extractors.ibge import PNAD_BASE_URL, IBGEExtractor
from src.loaders.json_exporter import export_governments, export_indicators, export_metadata
from src.models.indicators import MonthlyDataPoint, PipelineResult, SourceStatus
from src.transformers.normalize import normalize_series

logger = logging.getLogger(__name__)

# Mapeamento fonte → indicadores que ela fornece
SOURCE_INDICATORS: dict[str, list[str]] = {
    "bcb": ["selic", "ipca", "dolar", "salario_minimo", "endividamento", "inadimplencia", "pib"],
    "dieese": ["cesta_basica"],
    "anp": ["gasolina"],
    "fipezap": ["aluguel"],
    "ibge": ["energia_eletrica"],
    "pnad": ["desemprego"],
}

# Metadados estáticos das fontes (URLs importadas dos extractors)
SOURCE_META: dict[str, dict[str, str]] = {
    "bcb": {
        "name": "Banco Central do Brasil",
        "url": BCB_URL,
    },
    "dieese": {
        "name": "DIEESE",
        "url": DIEESE_URL,
    },
    "anp": {
        "name": "ANP",
        "url": ANP_URL,
    },
    "fipezap": {
        "name": "FipeZAP / FIPE",
        "url": FIPEZAP_URL,
    },
    "ibge": {
        "name": "IBGE / SIDRA",
        "url": SIDRA_BASE_URL,
    },
    "pnad": {
        "name": "IBGE / PNAD Contínua",
        "url": PNAD_BASE_URL,
    },
}

ALL_INDICATORS = [ind for inds in SOURCE_INDICATORS.values() for ind in inds]


def _now_iso() -> str:
    """Retorna timestamp atual em ISO 8601 UTC."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _indicator_source(indicator: str) -> str:
    """Retorna o ID da fonte de um indicador.

    Args:
        indicator: Nome do indicador.

    Returns:
        ID da fonte ("bcb", "dieese" ou "anp").

    Raises:
        ValueError: Se indicador não reconhecido.
    """
    for source_id, indicators in SOURCE_INDICATORS.items():
        if indicator in indicators:
            return source_id
    raise ValueError(
        f"Indicador desconhecido: '{indicator}'. "
        f"Válidos: {ALL_INDICATORS}"
    )


def _extract_bcb(
    extractor: BCBExtractor,
    indicators: list[str],
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai indicadores do BCB.

    Args:
        extractor: Instância do BCBExtractor.
        indicators: Lista de indicadores BCB a extrair.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict mapeando indicador → lista de pontos.
    """
    results: dict[str, list[MonthlyDataPoint]] = {}
    for indicator in indicators:
        logger.info("Extraindo %s do BCB...", indicator)
        results[indicator] = extractor.extract(indicator, start_year, end_year)
    return results


def _extract_dieese(
    extractor: DIEESEExtractor,
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai cesta básica do DIEESE.

    Args:
        extractor: Instância do DIEESEExtractor.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict com chave "cesta_basica" → lista de pontos.
    """
    logger.info("Extraindo cesta básica do DIEESE...")
    points = extractor.extract(start_year, end_year)
    return {"cesta_basica": points}


def _extract_anp(
    extractor: ANPExtractor,
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai gasolina da ANP.

    Args:
        extractor: Instância do ANPExtractor.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict com chave "gasolina" → lista de pontos.
    """
    logger.info("Extraindo gasolina da ANP...")
    points = extractor.extract(start_year, end_year)
    return {"gasolina": points}


def _extract_fipezap(
    extractor: FipeZAPExtractor,
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai aluguel do FipeZAP.

    Args:
        extractor: Instância do FipeZAPExtractor.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict com chave "aluguel" → lista de pontos.
    """
    logger.info("Extraindo aluguel do FipeZAP...")
    points = extractor.extract(start_year, end_year)
    return {"aluguel": points}


def _extract_ibge(
    extractor: EnergiaExtractor,
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai energia elétrica residencial do IBGE SIDRA.

    Args:
        extractor: Instância do EnergiaExtractor.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict com chave "energia_eletrica" → lista de pontos.
    """
    logger.info("Extraindo energia elétrica do IBGE SIDRA...")
    points = extractor.extract(start_year, end_year)
    return {"energia_eletrica": points}


def _extract_pnad(
    extractor: IBGEExtractor,
    start_year: int,
    end_year: int,
) -> dict[str, list[MonthlyDataPoint]]:
    """Extrai taxa de desocupação do IBGE PNAD Contínua.

    Args:
        extractor: Instância do IBGEExtractor.
        start_year: Ano inicial.
        end_year: Ano final.

    Returns:
        Dict com chave "desemprego" → lista de pontos.
    """
    logger.info("Extraindo desemprego do IBGE PNAD Contínua...")
    points = extractor.extract(start_year, end_year)
    return {"desemprego": points}


def run_pipeline(
    start_year: int = 2005,
    end_year: int = 2025,
    output_dir: str = "../src/data",
    indicator: str | None = None,
) -> PipelineResult:
    """Executa o pipeline completo de coleta, transformação e exportação.

    Args:
        start_year: Ano inicial da extração.
        end_year: Ano final da extração.
        output_dir: Diretório de saída dos JSONs.
        indicator: Se informado, extrai apenas esse indicador.

    Returns:
        PipelineResult com indicadores extraídos, metadados e erros.
    """
    t0 = time.monotonic()
    result = PipelineResult()

    # Determinar quais fontes/indicadores rodar
    if indicator:
        source_id = _indicator_source(indicator)
        sources_to_run = {source_id: [indicator]}
    else:
        sources_to_run = dict(SOURCE_INDICATORS)

    all_indicators: dict[str, list[MonthlyDataPoint]] = {}
    sources_status: list[SourceStatus] = []

    # Instanciar extractors
    bcb = BCBExtractor()
    dieese = DIEESEExtractor()
    anp = ANPExtractor()
    fipezap = FipeZAPExtractor()
    ibge = EnergiaExtractor()
    pnad = IBGEExtractor()

    extractors = {
        "bcb": lambda inds: _extract_bcb(bcb, inds, start_year, end_year),
        "dieese": lambda _inds: _extract_dieese(dieese, start_year, end_year),
        "anp": lambda _inds: _extract_anp(anp, start_year, end_year),
        "fipezap": lambda _inds: _extract_fipezap(fipezap, start_year, end_year),
        "ibge": lambda _inds: _extract_ibge(ibge, start_year, end_year),
        "pnad": lambda _inds: _extract_pnad(pnad, start_year, end_year),
    }

    # Executar extração por fonte
    for source_id, indicators_list in sources_to_run.items():
        fetch_time = _now_iso()
        try:
            extracted = extractors[source_id](indicators_list)
            all_indicators.update(extracted)
            sources_status.append(
                SourceStatus(
                    id=source_id,
                    name=SOURCE_META[source_id]["name"],
                    url=SOURCE_META[source_id]["url"],
                    last_fetch=fetch_time,
                    status="success",
                )
            )
            logger.info(
                "Fonte %s: %d indicadores extraídos com sucesso",
                source_id,
                len(extracted),
            )
        except Exception as exc:
            result.errors.append(f"{source_id}: {exc}")
            sources_status.append(
                SourceStatus(
                    id=source_id,
                    name=SOURCE_META[source_id]["name"],
                    url=SOURCE_META[source_id]["url"],
                    last_fetch=fetch_time,
                    status="error",
                )
            )
            logger.error("Fonte %s falhou: %s", source_id, exc)

    # Verificar se todas as fontes falharam
    success_count = sum(1 for s in sources_status if s.status == "success")
    if not success_count:
        elapsed = time.monotonic() - t0
        logger.error(
            "Pipeline falhou: todas as %d fontes falharam em %.1fs",
            len(sources_status),
            elapsed,
        )
        raise RuntimeError(
            f"Pipeline falhou: todas as fontes falharam. "
            f"Erros: {result.errors}"
        )

    # Normalizar dados
    normalized: dict[str, list[MonthlyDataPoint]] = {}
    for key, points in all_indicators.items():
        normalized[key] = normalize_series(points, start_year, end_year)

    # Exportar JSONs
    export_indicators(normalized, output_dir)
    export_governments(output_dir)
    export_metadata(normalized, sources_status, output_dir)

    # Montar resultado
    from src.models.indicators import IndicatorData

    for key, points in normalized.items():
        result.indicators[key] = IndicatorData(name=key, points=points)

    result.metadata = {
        "sources_status": sources_status,
        "output_dir": output_dir,
    }

    elapsed = time.monotonic() - t0
    ok = len(normalized)
    failed = len(result.errors)
    logger.info(
        "Pipeline concluído em %.1fs: %d indicadores OK, %d erros",
        elapsed,
        ok,
        failed,
    )

    return result


def _build_parser() -> argparse.ArgumentParser:
    """Constrói o parser de argumentos da CLI.

    Returns:
        ArgumentParser configurado.
    """
    parser = argparse.ArgumentParser(
        description="Pipeline de coleta de dados econômicos do Brasil",
    )
    parser.add_argument(
        "--indicador",
        type=str,
        default=None,
        choices=ALL_INDICATORS,
        help="Rodar apenas um indicador específico",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="../src/data",
        help="Diretório de saída dos JSONs (default: ../src/data)",
    )
    parser.add_argument(
        "--start-year",
        type=int,
        default=2005,
        help="Ano inicial da extração (default: 2005)",
    )
    parser.add_argument(
        "--end-year",
        type=int,
        default=2025,
        help="Ano final da extração (default: 2025)",
    )
    return parser


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    parser = _build_parser()
    args = parser.parse_args()

    try:
        pipeline_result = run_pipeline(
            start_year=args.start_year,
            end_year=args.end_year,
            output_dir=args.output,
            indicator=args.indicador,
        )
        failed = len(pipeline_result.errors)
        if failed:
            logger.warning("Pipeline terminou com %d erro(s)", failed)
            sys.exit(1)
    except RuntimeError as e:
        logger.error(str(e))
        sys.exit(2)
