/**
 * Faixa de comparação lado a lado entre dois períodos.
 *
 * Mostra o valor de um indicador no início e no fim da série,
 * em formato "[valor 2005] vs [valor 2025]".
 */

"use client";

import { useIndicators } from "@/hooks/useIndicators";
import type { IndicatorKey } from "@/types/indicator";
import { INDICATOR_CONFIG } from "@/utils/constants";
import {
  formatCurrency,
  formatPercent,
  formatDollar,
  formatPricePerLiter,
} from "@/utils/formatters";

type ComparisonStripProps = {
  /** Chave do indicador a comparar. */
  indicator: IndicatorKey;
  /** Label de exibição (ex: "Salário mínimo"). */
  label: string;
};

/** Formata valor conforme a unidade do indicador. */
const formatForIndicator = (key: IndicatorKey, value: number): string => {
  const unit = INDICATOR_CONFIG[key].unit;
  if (unit === "R$") return formatCurrency(value);
  if (unit === "R$/USD") return formatDollar(value);
  if (unit === "R$/litro") return formatPricePerLiter(value);
  return formatPercent(value);
};

/** Faixa de comparação: valor antigo vs valor atual. */
const ComparisonStrip = ({ indicator, label }: ComparisonStripProps) => {
  const { data } = useIndicators([indicator]);
  const points = data[indicator] ?? [];

  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const firstYear = first.date.split("-")[0];
  const lastYear = last.date.split("-")[0];

  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] font-ui"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px",
          background: "var(--bg-surface)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "var(--fs-label)",
            color: "var(--text-tertiary)",
            marginBottom: "4px",
          }}
        >
          {label} em {firstYear}
        </p>
        <p style={{ fontSize: "18px", fontWeight: 500 }}>
          {formatForIndicator(indicator, first.value)}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          color: "var(--text-tertiary)",
          fontSize: "var(--fs-body-sm)",
        }}
      >
        vs
      </div>

      <div style={{ padding: "16px", textAlign: "center" }}>
        <p
          style={{
            fontSize: "var(--fs-label)",
            color: "var(--text-tertiary)",
            marginBottom: "4px",
          }}
        >
          {label} em {lastYear}
        </p>
        <p style={{ fontSize: "18px", fontWeight: 500 }}>
          {formatForIndicator(indicator, last.value)}
        </p>
      </div>
    </div>
  );
};

export default ComparisonStrip;
