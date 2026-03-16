/**
 * Tooltip customizado do gráfico de séries temporais.
 *
 * Exibe data formatada e valores reais (não normalizados) de cada
 * indicador ativo, usando a formatação adequada por tipo de unidade.
 */

import type { IndicatorKey } from "@/types/indicator";
import { INDICATOR_CONFIG } from "@/utils/constants";
import {
  formatCurrency,
  formatPercent,
  formatDollar,
  formatPricePerLiter,
  formatDateShort,
} from "@/utils/formatters";

/** Formata valor conforme a unidade do indicador. */
const formatValue = (key: IndicatorKey, value: number): string => {
  const config = INDICATOR_CONFIG[key];
  if (config.isIndexSeries) {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1).replace(".", ",")}%`;
  }
  if (config.unit === "R$") return formatCurrency(value);
  if (config.unit === "R$/USD") return formatDollar(value);
  if (config.unit === "R$/litro") return formatPricePerLiter(value);
  return formatPercent(value);
};

type PayloadItem = {
  dataKey: string;
  color: string;
  payload: Record<string, string | number | undefined>;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: PayloadItem[];
  label?: string;
};

/** Tooltip com data formatada + valores reais por indicador. */
const ChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const dataPoint = payload[0].payload;

  return (
    <div
      className="font-ui"
      style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "10px 12px",
        fontSize: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <p
        style={{
          fontWeight: 500,
          marginBottom: "6px",
          color: "var(--text-primary)",
        }}
      >
        {formatDateShort(label)}
      </p>
      {payload.map((item) => {
        const key = item.dataKey as IndicatorKey;
        const realValue = dataPoint[`_${key}`];
        if (realValue === undefined || typeof realValue !== "number")
          return null;
        const config = INDICATOR_CONFIG[key];
        if (!config) return null;
        return (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "2px",
            }}
          >
            <span style={{ color: item.color }}>{config.shortLabel}</span>
            <span
              style={{ fontWeight: 500, color: "var(--text-primary)" }}
            >
              {formatValue(key, realValue)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ChartTooltip;
