/**
 * Gráfico principal de séries temporais com linhas normalizadas (base 100).
 *
 * Cada indicador ativo é plotado como variação percentual relativa ao
 * primeiro ponto da série, permitindo comparação visual entre indicadores
 * de escalas diferentes. O tooltip mostra valores reais.
 *
 * Faixas coloridas de governo e annotations de eventos históricos
 * aparecem atrás das linhas.
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
  ReferenceArea,
  ReferenceLine,
} from "recharts";

import type { IndicatorKey } from "@/types/indicator";
import type { GovernmentPeriod } from "@/types/government";
import type { FilteredData } from "@/hooks/useIndicators";
import { INDICATOR_CONFIG } from "@/utils/constants";
import ChartTooltip from "./ChartTooltip";
import { CHART_EVENTS } from "./ChartAnnotations";

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

const YEAR_TICKS = ["2005-01", "2010-01", "2015-01", "2020-01", "2025-01"];
const DATA_START = "2005-01";
const DATA_END = "2025-12";

type TimeSeriesChartProps = {
  /** Dados filtrados do useIndicators. */
  data: FilteredData;
  /** Set de indicadores ativos. */
  activeIndicators: Set<IndicatorKey>;
  /** Períodos de governo pra faixas coloridas. */
  governments: GovernmentPeriod[];
};

/** Gráfico de linhas normalizadas com faixas de governo e annotations. */
const TimeSeriesChart = ({
  data,
  activeIndicators,
  governments,
}: TimeSeriesChartProps) => {
  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    const firstValues: Partial<Record<IndicatorKey, number>> = {};
    const lookups: Partial<Record<IndicatorKey, Record<string, number>>> = {};
    const rawLookups: Partial<Record<IndicatorKey, Record<string, number>>> = {};

    for (const key of ALL_KEYS) {
      if (!activeIndicators.has(key)) continue;
      const points = data[key];
      if (!points || points.length === 0) continue;

      const map: Record<string, number> = {};

      if (INDICATOR_CONFIG[key].isVariationRate) {
        // Variações mensais (%) → índice acumulado (base 100)
        const raw: Record<string, number> = {};
        let index = 100;
        for (const p of points) {
          index *= 1 + p.value / 100;
          map[p.date] = index;
          raw[p.date] = p.value;
          allDates.add(p.date);
        }
        firstValues[key] = 100;
        rawLookups[key] = raw;
      } else {
        for (const p of points) {
          map[p.date] = p.value;
          allDates.add(p.date);
        }
        firstValues[key] = points[0].value;
      }

      lookups[key] = map;
    }

    // Adicionar limites de governo (clipados ao período de dados)
    for (const gov of governments) {
      const start = gov.start < DATA_START ? DATA_START : gov.start;
      const end = gov.end > DATA_END ? DATA_END : gov.end;
      if (start <= DATA_END && end >= DATA_START) {
        allDates.add(start);
        allDates.add(end);
      }
    }

    // Adicionar datas de eventos pra annotations
    for (const event of CHART_EVENTS) {
      allDates.add(event.date);
    }

    // Garantir que ticks de ano existam
    for (const tick of YEAR_TICKS) {
      allDates.add(tick);
    }

    const dates = Array.from(allDates).sort();
    return dates.map((date) => {
      const point: Record<string, string | number | undefined> = { date };
      for (const key of ALL_KEYS) {
        const map = lookups[key];
        if (!map) continue;
        const value = map[date];
        const first = firstValues[key];
        if (value !== undefined && first !== undefined && first !== 0) {
          point[key] = (value / first) * 100;
          // Pro tooltip: valor original (variação mensal) ou valor real
          const rawMap = rawLookups[key];
          point[`_${key}`] = rawMap ? rawMap[date] ?? value : value;
        }
      }
      return point;
    });
  }, [data, activeIndicators, governments]);

  const activeKeys = ALL_KEYS.filter(
    (key) => activeIndicators.has(key) && data[key] && data[key]!.length > 0
  );

  // Faixas de governo clipadas ao período de dados
  const govBands = governments.flatMap((gov) => {
    const x1 = gov.start < DATA_START ? DATA_START : gov.start;
    const x2 = gov.end > DATA_END ? DATA_END : gov.end;
    if (x1 > DATA_END || x2 < DATA_START) return [];
    return [{ id: gov.id, x1, x2, color: gov.color }];
  });

  return (
    <div
      role="img"
      aria-label="Gráfico de evolução dos indicadores econômicos de 2005 a 2025, com valores normalizados para comparação"
    >
    <ResponsiveContainer width="100%" height={280}>
      <LineChart
        data={chartData}
        margin={{ top: 20, right: 8, bottom: 0, left: 8 }}
      >
        {govBands.map((band) => (
          <ReferenceArea
            key={band.id}
            x1={band.x1}
            x2={band.x2}
            fill={band.color}
            fillOpacity={0.04}
            strokeOpacity={0}
          />
        ))}

        {CHART_EVENTS.map((event) => (
          <ReferenceLine
            key={event.date}
            x={event.date}
            stroke="#9b9b9b"
            strokeDasharray="3 3"
            strokeWidth={0.5}
            label={{
              value: event.label,
              position: "top",
              fill: "#9b9b9b",
              fontSize: 10,
            }}
          />
        ))}

        <XAxis
          dataKey="date"
          ticks={YEAR_TICKS}
          tickFormatter={(date: string) => date.split("-")[0]}
          tick={{ fontSize: 11, fill: "#9b9b9b" }}
          axisLine={{ stroke: "#e5e5e5" }}
          tickLine={false}
        />

        <YAxis hide />

        <Tooltip content={<ChartTooltip />} />

        {activeKeys.map((key) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={INDICATOR_CONFIG[key].color}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            activeDot={{ r: 3, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
};

export default TimeSeriesChart;
