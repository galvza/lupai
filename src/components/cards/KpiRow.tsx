/**
 * Linha de KPIs com valores atuais e deltas vs 2005.
 *
 * Exibe Selic, Dólar e Cesta Básica em grid de 3 colunas,
 * com indicação visual de alta (vermelho) ou queda (verde).
 */

"use client";

import { useIndicators } from "@/hooks/useIndicators";
import {
  formatPercent,
  formatDollar,
  formatCurrency,
  formatDateShort,
} from "@/utils/formatters";

/** Linha de 3 KPIs: Selic, Dólar e Cesta Básica. */
const KpiRow = () => {
  const { data } = useIndicators(["selic", "dolar", "cestaBasica"]);

  const selic = data.selic ?? [];
  const dolar = data.dolar ?? [];
  const cesta = data.cestaBasica ?? [];

  const lastDate = (series: typeof selic) =>
    series.length > 0 ? formatDateShort(series[series.length - 1].date).toLowerCase() : "";

  const kpis = [
    {
      label: selic.length > 0 ? `Selic (${lastDate(selic)})` : "Selic",
      current:
        selic.length > 0
          ? formatPercent(selic[selic.length - 1].value)
          : "—",
      firstValue: selic[0]?.value ?? null,
      lastValue: selic.length > 0 ? selic[selic.length - 1].value : null,
      firstFmt: selic.length > 0 ? formatPercent(selic[0].value) : "—",
      year: selic[0]?.date.split("-")[0] ?? "2005",
    },
    {
      label: dolar.length > 0 ? `Dólar (${lastDate(dolar)})` : "Dólar",
      current:
        dolar.length > 0
          ? formatDollar(dolar[dolar.length - 1].value)
          : "—",
      firstValue: dolar[0]?.value ?? null,
      lastValue: dolar.length > 0 ? dolar[dolar.length - 1].value : null,
      firstFmt: dolar.length > 0 ? formatDollar(dolar[0].value) : "—",
      year: dolar[0]?.date.split("-")[0] ?? "2005",
    },
    {
      label: cesta.length > 0 ? `Cesta básica SP (${lastDate(cesta)})` : "Cesta básica SP",
      current:
        cesta.length > 0
          ? formatCurrency(cesta[cesta.length - 1].value)
          : "—",
      firstValue: cesta[0]?.value ?? null,
      lastValue: cesta.length > 0 ? cesta[cesta.length - 1].value : null,
      firstFmt: cesta.length > 0 ? formatCurrency(cesta[0].value) : "—",
      year: cesta[0]?.date.split("-")[0] ?? "2005",
    },
  ];

  return (
    <div
      className="mb-8 font-ui"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {kpis.map((kpi, i) => {
          const up =
            kpi.firstValue !== null &&
            kpi.lastValue !== null &&
            kpi.lastValue > kpi.firstValue;
          const down =
            kpi.firstValue !== null &&
            kpi.lastValue !== null &&
            kpi.lastValue < kpi.firstValue;
          const arrow = up ? "↑" : down ? "↓" : "";
          const color = up
            ? "var(--accent-red)"
            : down
              ? "var(--accent-green)"
              : "var(--text-tertiary)";

          return (
            <div
              key={kpi.label}
              className={i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}
              style={{
                borderColor: "var(--border)",
                padding: "16px",
                background: "white",
              }}
            >
              <p
                style={{
                  fontSize: "var(--fs-label)",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                {kpi.label}
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "4px",
                }}
              >
                {kpi.current}
              </p>
              <p style={{ fontSize: "var(--fs-label)", color }}>
                {arrow} era {kpi.firstFmt} em {kpi.year}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KpiRow;
