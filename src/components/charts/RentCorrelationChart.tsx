/**
 * Gráfico de correlação Aluguel × Selic ao longo do tempo.
 *
 * Mostra as duas séries normalizadas (base 100) pra visualizar a
 * relação indireta entre juros e aluguel: Selic alta trava financiamento,
 * demanda por locação sobe, aluguel acompanha.
 * Título e subtítulo hardcoded dentro do componente.
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

const YEAR_TICKS = ["2008-01", "2012-01", "2016-01", "2020-01", "2025-01"];

type TooltipProps = {
  active?: boolean;
  payload?: {
    dataKey: string;
    color: string;
    payload: Record<string, number | string | undefined>;
  }[];
  label?: string;
};

/** Tooltip customizado do gráfico Aluguel × Selic. */
const RentTooltip = ({ active, payload, label }: TooltipProps) => {
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
            {formatPercent(point._selic)} a.a.
          </span>
        </div>
      )}
      {typeof point._aluguel === "number" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <span style={{ color: INDICATOR_CONFIG.aluguel.color }}>
            Aluguel
          </span>
          <span style={{ fontWeight: 500 }}>
            {formatPercent(point._aluguel)} var. mensal
          </span>
        </div>
      )}
    </div>
  );
};

/** Gráfico Aluguel × Selic normalizado com título embutido. */
const RentCorrelationChart = () => {
  const { data } = useIndicators(["selic", "aluguel"]);

  const chartData = useMemo(() => {
    const selic = data.selic ?? [];
    const aluguel = data.aluguel ?? [];
    const allDates = new Set<string>();
    const selicMap: Record<string, number> = {};
    const aluguelMap: Record<string, number> = {};
    const selicFirst = selic[0]?.value ?? 1;
    const aluguelFirst = aluguel[0]?.value ?? 1;

    for (const p of selic) {
      selicMap[p.date] = p.value;
      allDates.add(p.date);
    }
    for (const p of aluguel) {
      aluguelMap[p.date] = p.value;
      allDates.add(p.date);
    }
    for (const t of YEAR_TICKS) allDates.add(t);

    return Array.from(allDates)
      .sort()
      .map((date) => {
        const sv = selicMap[date];
        const av = aluguelMap[date];
        return {
          date,
          selic:
            sv !== undefined && selicFirst !== 0
              ? (sv / selicFirst) * 100
              : undefined,
          aluguel:
            av !== undefined && aluguelFirst !== 0
              ? (av / aluguelFirst) * 100
              : undefined,
          _selic: sv,
          _aluguel: av,
        };
      });
  }, [data]);

  const hasAluguel = (data.aluguel ?? []).length > 0;

  return (
    <div>
      <h3
        className="text-[15px] sm:text-base"
        style={{ fontWeight: 500, marginBottom: "4px" }}
      >
        Quando comprar fica caro, alugar fica pior
      </h3>
      <p
        className="text-[12px] sm:text-[13px]"
        style={{
          lineHeight: 1.6,
          color: "var(--text-tertiary)",
          marginBottom: "16px",
        }}
      >
        Selic alta trava o financiamento — e quem não compra, aluga. A demanda
        sobe, o aluguel acompanha.
      </p>
      {hasAluguel ? (
        <>
          <div
            role="img"
            aria-label="Gráfico comparando Selic e índice de aluguel FipeZAP"
          >
            <ResponsiveContainer width="100%" height={200}>
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
                <Tooltip content={<RentTooltip />} />
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
                  dataKey="aluguel"
                  stroke={INDICATOR_CONFIG.aluguel.color}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div
            className="font-ui"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              marginTop: "8px",
              fontSize: "12px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  background: INDICATOR_CONFIG.selic.color,
                }}
              />
              <span style={{ color: "var(--text-tertiary)" }}>
                {INDICATOR_CONFIG.selic.shortLabel}
              </span>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <div
                style={{
                  width: "12px",
                  height: "2px",
                  background: INDICATOR_CONFIG.aluguel.color,
                }}
              />
              <span style={{ color: "var(--text-tertiary)" }}>
                {INDICATOR_CONFIG.aluguel.shortLabel}
              </span>
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
            (valores normalizados — base 100 no início de cada série)
          </p>
          <p
            style={{
              fontSize: "var(--fs-body-sm)",
              color: "var(--text-secondary)",
              fontStyle: "italic",
              fontFamily: "Georgia, 'Times New Roman', serif",
              marginTop: "8px",
            }}
          >
            Exceção: em 2015–2016, a recessão foi tão severa que o desemprego
            destruiu a demanda por imóveis — mesmo com a Selic em 14,25%, o
            aluguel caiu. A correlação só vale quando a economia está
            funcionando.
          </p>
        </>
      ) : (
        <p
          className="font-ui"
          style={{
            fontSize: "var(--fs-body-sm)",
            color: "var(--text-tertiary)",
            fontStyle: "italic",
            textAlign: "center",
            padding: "32px 0",
          }}
        >
          Dados de aluguel ainda não disponíveis. Execute o pipeline pra
          carregar.
        </p>
      )}
    </div>
  );
};

export default RentCorrelationChart;
