/**
 * Hook central de carregamento e filtragem de indicadores econômicos.
 *
 * Carrega dados estáticos de `src/data/`, expõe estado de indicadores
 * ativos, governo selecionado e período customizado, além de funções
 * pra alternar indicadores e selecionar governo.
 */

import { useMemo, useState } from "react";

import type { IndicatorKey, IndicatorsMap, MonthlyDataPoint } from "@/types/indicator";
import type { GovernmentPeriod } from "@/types/government";
import { filterByGovernment, filterByDateRange } from "@/utils/calculations";
import indicatorsRaw from "@/data/indicators.json";
import governmentsRaw from "@/data/governments.json";

const ALL_KEYS: IndicatorKey[] = [
  "selic",
  "ipca",
  "dolar",
  "salarioMinimo",
  "cestaBasica",
  "gasolina",
  "endividamento",
  "inadimplencia",
  "aluguel",
  "energiaEletrica",
  "desemprego",
  "pib",
];

/** Indicadores ativos por padrão (originais). Novos iniciam desligados. */
const DEFAULT_ACTIVE: IndicatorKey[] = [
  "selic",
  "ipca",
  "dolar",
  "salarioMinimo",
  "cestaBasica",
  "gasolina",
  "endividamento",
  "inadimplencia",
];

/** Dados retornados pelo hook, filtrados conforme estado atual. */
export type FilteredData = Partial<Record<IndicatorKey, MonthlyDataPoint[]>>;

/** Retorno do hook useIndicators. */
export type UseIndicatorsReturn = {
  /** Dados filtrados (apenas indicadores ativos, filtrados por governo/período). */
  data: FilteredData;
  /** Set de indicadores ativos. */
  activeIndicators: Set<IndicatorKey>;
  /** ID do governo selecionado, ou null pra "todos". */
  selectedGovernment: string | null;
  /** Período customizado [start, end] em "YYYY-MM", ou null. */
  dateRange: [string, string] | null;
  /** Lista de governos disponíveis. */
  governments: GovernmentPeriod[];
  /** Metadados do dataset (lastUpdated, period). */
  metadata: { lastUpdated: string; period: { start: string; end: string } };
  /** Liga/desliga um indicador no gráfico. */
  toggleIndicator: (key: IndicatorKey) => void;
  /** Seleciona governo pra filtro (null = todos). */
  selectGovernment: (id: string | null) => void;
  /** Define período customizado (null = sem filtro). */
  setDateRange: (range: [string, string] | null) => void;
};

/**
 * Hook que carrega indicadores e governos, e expõe dados filtrados.
 *
 * @param initialActive - Indicadores ativos no carregamento (default: todos).
 * @returns Estado e funções de controle dos indicadores.
 */
export const useIndicators = (
  initialActive?: IndicatorKey[]
): UseIndicatorsReturn => {
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(
    () => new Set(initialActive ?? DEFAULT_ACTIVE)
  );
  const [selectedGovernment, setSelectedGovernment] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const raw = indicatorsRaw as Record<string, unknown>;
  const indicators = useMemo(
    () => (raw.indicators ?? {}) as unknown as IndicatorsMap,
    [raw.indicators]
  );
  const governments = useMemo(
    () =>
      ((governmentsRaw as Record<string, unknown>).governments ??
        []) as GovernmentPeriod[],
    []
  );

  const metadata = useMemo(
    () => ({
      lastUpdated: (raw.lastUpdated as string) ?? "",
      period: (raw.period as { start: string; end: string }) ?? {
        start: "",
        end: "",
      },
    }),
    [raw.lastUpdated, raw.period]
  );

  const selectedGov = useMemo(
    () =>
      selectedGovernment
        ? governments.find((g) => g.id === selectedGovernment) ?? null
        : null,
    [selectedGovernment, governments]
  );

  const data = useMemo<FilteredData>(() => {
    const result: FilteredData = {};

    for (const key of ALL_KEYS) {
      if (!activeIndicators.has(key)) continue;

      let points = indicators[key] ?? [];

      if (selectedGov) {
        points = filterByGovernment(points, selectedGov);
      }

      if (dateRange) {
        points = filterByDateRange(points, dateRange[0], dateRange[1]);
      }

      result[key] = points;
    }

    return result;
  }, [activeIndicators, selectedGov, dateRange, indicators]);

  const toggleIndicator = (key: IndicatorKey): void => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectGovernment = (id: string | null): void => {
    setSelectedGovernment(id);
  };

  return {
    data,
    activeIndicators,
    selectedGovernment,
    dateRange,
    governments,
    metadata,
    toggleIndicator,
    selectGovernment,
    setDateRange,
  };
};
