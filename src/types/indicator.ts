/** Ponto de dado mensal de um indicador econômico. */
export type MonthlyDataPoint = {
  /** Formato "YYYY-MM" (ex: "2024-03") */
  date: string;
  /** Valor numérico (ex: 13.75, 4.62, 5.12) */
  value: number;
};

/** Chaves dos 12 indicadores econômicos do dashboard. */
export type IndicatorKey =
  | "selic"
  | "ipca"
  | "dolar"
  | "salarioMinimo"
  | "cestaBasica"
  | "gasolina"
  | "endividamento"
  | "inadimplencia"
  | "aluguel"
  | "energiaEletrica"
  | "desemprego"
  | "pib";

/** Mapa de indicadores: cada chave contém sua série temporal. */
export type IndicatorsMap = Record<IndicatorKey, MonthlyDataPoint[]>;

/** Estrutura completa do indicators.json. */
export type IndicatorsData = {
  /** ISO 8601: "2026-03-12T10:00:00Z" */
  lastUpdated: string;
  /** Período coberto pelos dados. */
  period: {
    /** Formato "YYYY-MM" (ex: "2005-01") */
    start: string;
    /** Formato "YYYY-MM" (ex: "2025-12") */
    end: string;
  };
  /** Séries temporais dos 12 indicadores. */
  indicators: IndicatorsMap;
};
