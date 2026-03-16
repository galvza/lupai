/**
 * Gráfico do ciclo Selic × Endividamento × Inadimplência.
 *
 * Mostra as três séries normalizadas (base 100) pra visualizar
 * como juros, dívida das famílias e calotes se movem juntos.
 * Título, subtítulo e nota sobre dados de inadimplência embutidos.
 */

"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useIndicators } from "@/hooks/useIndicators";
import { INDICATOR_CONFIG } from "@/utils/constants";
import { formatPercent, formatDateShort } from "@/utils/formatters";

const YEAR_TICKS = ["2005-01", "2010-01", "2015-01", "2020-01", "2025-01"];

type TooltipProps = {
  active?: boolean;
  payload?: {
    dataKey: string;
    color: string;
    payload: Record<string, number | string | undefined>;
  }[];
  label?: string;
};

/** Tooltip do gráfico de dívida mostrando valores reais. */
const DebtTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload || !label) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

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
      <p style={{ fontWeight: 500, marginBottom: "4px" }}>
        {formatDateShort(label)}
      </p>
      {typeof point._selic === "number" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <span style={{ color: INDICATOR_CONFIG.selic.color }}>Selic</span>
          <span style={{ fontWeight: 500 }}>
            {formatPercent(point._selic)}
          </span>
        </div>
      )}
      {typeof point._endividamento === "number" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <span style={{ color: INDICATOR_CONFIG.endividamento.color }}>
            Endividamento
          </span>
          <span style={{ fontWeight: 500 }}>
            {formatPercent(point._endividamento)} da renda
          </span>
        </div>
      )}
      {typeof point._inadimplencia === "number" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <span style={{ color: INDICATOR_CONFIG.inadimplencia.color }}>
            Inadimplência
          </span>
          <span style={{ fontWeight: 500 }}>
            {formatPercent(point._inadimplencia)}
          </span>
        </div>
      )}
    </div>
  );
};

/** Gráfico Selic × Endividamento × Inadimplência com título embutido. */
const DebtCycleChart = () => {
  const { data } = useIndicators(["selic", "endividamento", "inadimplencia"]);

  const chartData = useMemo(() => {
    const selic = data.selic ?? [];
    const endiv = data.endividamento ?? [];
    const inadim = data.inadimplencia ?? [];
    const allDates = new Set<string>();
    const selicMap: Record<string, number> = {};
    const endivMap: Record<string, number> = {};
    const inadimMap: Record<string, number> = {};
    const selicFirst = selic[0]?.value ?? 1;
    const endivFirst = endiv[0]?.value ?? 1;
    const inadimFirst = inadim[0]?.value ?? 1;

    for (const p of selic) {
      selicMap[p.date] = p.value;
      allDates.add(p.date);
    }
    for (const p of endiv) {
      endivMap[p.date] = p.value;
      allDates.add(p.date);
    }
    for (const p of inadim) {
      inadimMap[p.date] = p.value;
      allDates.add(p.date);
    }
    for (const t of YEAR_TICKS) allDates.add(t);

    return Array.from(allDates)
      .sort()
      .map((date) => {
        const sv = selicMap[date];
        const ev = endivMap[date];
        const iv = inadimMap[date];
        return {
          date,
          selic: sv !== undefined ? (sv / selicFirst) * 100 : undefined,
          endividamento:
            ev !== undefined ? (ev / endivFirst) * 100 : undefined,
          inadimplencia:
            iv !== undefined ? (iv / inadimFirst) * 100 : undefined,
          _selic: sv,
          _endividamento: ev,
          _inadimplencia: iv,
        };
      });
  }, [data]);

  return (
    <div>
      <h3
        className="text-[15px] sm:text-base"
        style={{ fontWeight: 500, marginBottom: "4px" }}
      >
        O ciclo que ninguém quebra
      </h3>
      <p
        className="text-[12px] sm:text-[13px]"
        style={{
          lineHeight: 1.6,
          color: "var(--text-tertiary)",
          marginBottom: "16px",
        }}
      >
        Juro sobe, crédito encarece, família se endivida, inadimplência
        explode, economia freia, governo baixa juro, crédito barateia, família
        se endivida de novo. Repete.
      </p>
      <div
        role="img"
        aria-label="Gráfico do ciclo Selic, endividamento e inadimplência de 2005 a 2025"
      >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
        >
          <XAxis
            dataKey="date"
            ticks={YEAR_TICKS}
            tickFormatter={(d: string) => d.split("-")[0]}
            tick={{ fontSize: 11, fill: "#9b9b9b" }}
            axisLine={{ stroke: "#e5e5e5" }}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<DebtTooltip />} />
          <Line
            type="monotone"
            dataKey="selic"
            stroke={INDICATOR_CONFIG.selic.color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="endividamento"
            stroke={INDICATOR_CONFIG.endividamento.color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="inadimplencia"
            stroke={INDICATOR_CONFIG.inadimplencia.color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
      {/* Custom legend below chart */}
      <div
        className="font-ui"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginTop: "8px",
          fontSize: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "2px",
              background: INDICATOR_CONFIG.selic.color,
            }}
          />
          <span style={{ color: "var(--text-tertiary)" }}>Selic</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "2px",
              background: INDICATOR_CONFIG.endividamento.color,
            }}
          />
          <span style={{ color: "var(--text-tertiary)" }}>Endividamento</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "12px",
              height: "2px",
              background: INDICATOR_CONFIG.inadimplencia.color,
            }}
          />
          <span style={{ color: "var(--text-tertiary)" }}>Inadimplência</span>
        </div>
      </div>
      <p
        className="font-ui"
        style={{
          fontSize: "var(--fs-label)",
          color: "var(--text-tertiary)",
          textAlign: "center",
          marginTop: "8px",
          fontStyle: "italic",
        }}
      >
        (dados de inadimplência disponíveis a partir de 2011)
      </p>
    </div>
  );
};

export default DebtCycleChart;
