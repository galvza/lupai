"""Modelos de dados do pipeline ETL.

Dataclasses que representam a estrutura dos dados processados pelo pipeline.
Espelham os tipos TypeScript definidos em src/types/.
"""

from dataclasses import dataclass, field


@dataclass
class MonthlyDataPoint:
    """Ponto de dado mensal de um indicador econômico.

    Attributes:
        date: Data no formato "YYYY-MM" (ex: "2024-03").
        value: Valor numérico do indicador.
    """

    date: str
    value: float


@dataclass
class IndicatorData:
    """Série temporal de um indicador econômico.

    Attributes:
        name: Identificador do indicador (ex: "selic", "ipca").
        points: Lista de pontos de dados mensais.
    """

    name: str
    points: list[MonthlyDataPoint] = field(default_factory=list)


@dataclass
class SourceStatus:
    """Status de uma fonte de dados após a coleta.

    Attributes:
        id: Identificador da fonte ("bcb", "dieese", "anp").
        name: Nome da fonte.
        url: URL da fonte.
        last_fetch: Timestamp ISO 8601 da última coleta.
        status: Resultado da coleta ("success" ou "error").
    """

    id: str
    name: str
    url: str
    last_fetch: str
    status: str  # "success" | "error"


@dataclass
class PipelineResult:
    """Resultado completo da execução do pipeline.

    Attributes:
        indicators: Dicionário mapeando nome do indicador à sua série.
        metadata: Dicionário com metadados da execução (fontes, timestamps).
        errors: Lista de mensagens de erro ocorridas durante a execução.
    """

    indicators: dict[str, IndicatorData] = field(default_factory=dict)
    metadata: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
