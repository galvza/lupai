/**
 * Funções de cálculo e filtragem de séries temporais do dashboard.
 *
 * Todas as funções são puras (entrada → saída, sem side effects) e
 * tratam séries vazias sem erros.
 */

import type { MonthlyDataPoint } from "../types/indicator";
import type { GovernmentPeriod } from "../types/government";

/**
 * Calcula variação percentual entre dois valores.
 * @param initial - Valor inicial.
 * @param final_ - Valor final.
 * @returns Variação percentual ou null se initial = 0.
 */
export const percentChange = (
  initial: number,
  final_: number
): number | null => {
  if (initial === 0) return null;
  return ((final_ - initial) / initial) * 100;
};

/**
 * Calcula variação acumulada de uma série (primeiro ao último ponto).
 * @param points - Série temporal.
 * @returns Variação percentual acumulada ou null se < 2 pontos ou primeiro = 0.
 */
export const accumulatedChange = (
  points: MonthlyDataPoint[]
): number | null => {
  if (points.length < 2) return null;
  return percentChange(points[0].value, points[points.length - 1].value);
};

/**
 * Encontra o ponto de maior ou menor valor na série.
 * @param points - Série temporal.
 * @param type - "max" ou "min".
 * @returns MonthlyDataPoint com o valor extremo ou null se vazia.
 */
export const findExtreme = (
  points: MonthlyDataPoint[],
  type: "max" | "min"
): MonthlyDataPoint | null => {
  if (points.length === 0) return null;
  return points.reduce((extreme, point) =>
    type === "max"
      ? point.value > extreme.value
        ? point
        : extreme
      : point.value < extreme.value
        ? point
        : extreme
  );
};

/**
 * Calcula a média aritmética dos valores de uma série.
 * @param points - Série temporal.
 * @returns Média ou null se vazia.
 */
export const calculateAverage = (
  points: MonthlyDataPoint[]
): number | null => {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => acc + p.value, 0);
  return sum / points.length;
};

/**
 * Filtra pontos que estão dentro do período de um governo (inclusive).
 * @param points - Série temporal.
 * @param gov - Período de governo.
 * @returns Pontos dentro do período.
 */
export const filterByGovernment = (
  points: MonthlyDataPoint[],
  gov: GovernmentPeriod
): MonthlyDataPoint[] => {
  return points.filter((p) => p.date >= gov.start && p.date <= gov.end);
};

/**
 * Filtra pontos dentro de um range de datas (inclusive).
 * @param points - Série temporal.
 * @param start - Data inicial "YYYY-MM".
 * @param end - Data final "YYYY-MM".
 * @returns Pontos dentro do range.
 */
export const filterByDateRange = (
  points: MonthlyDataPoint[],
  start: string,
  end: string
): MonthlyDataPoint[] => {
  return points.filter((p) => p.date >= start && p.date <= end);
};

/**
 * Compõe variações mensais (%) em variação acumulada.
 *
 * Cada ponto representa uma variação mensal (ex: 2.5 = +2,5% no mês).
 * O resultado é a variação total do período: (1+r1)(1+r2)...(1+rN) - 1.
 *
 * @param points - Série de variações mensais em %.
 * @returns Variação acumulada em %, ou null se vazia.
 */
export const compoundMonthlyRates = (
  points: MonthlyDataPoint[]
): number | null => {
  if (points.length === 0) return null;
  let factor = 1;
  for (const p of points) {
    factor *= 1 + p.value / 100;
  }
  return (factor - 1) * 100;
};

/**
 * Compõe taxas anuais de uma série pra calcular variação acumulada.
 *
 * Trata cada ponto como uma taxa anual vigente no período até o próximo ponto.
 * Útil pra calcular inflação total a partir de taxas IPCA anualizadas.
 *
 * @param points - Série de taxas anuais (ex: IPCA acumulado 12 meses).
 * @returns Variação acumulada em %, ou 0 se < 2 pontos.
 */
export const compoundAnnualRates = (
  points: MonthlyDataPoint[]
): number => {
  if (points.length < 2) return 0;
  let factor = 1;
  for (let i = 0; i < points.length - 1; i++) {
    const [yA, mA] = points[i].date.split("-").map(Number);
    const [yB, mB] = points[i + 1].date.split("-").map(Number);
    const years = yB - yA + (mB - mA) / 12;
    factor *= Math.pow(1 + points[i].value / 100, years);
  }
  return (factor - 1) * 100;
};

/**
 * Calcula coeficiente de correlação de Pearson entre duas séries.
 *
 * Alinha as séries por data (usa apenas datas em comum).
 *
 * @param seriesA - Primeira série temporal.
 * @param seriesB - Segunda série temporal.
 * @returns Coeficiente entre -1 e 1, ou null se não há dados suficientes.
 */
export const calculateCorrelation = (
  seriesA: MonthlyDataPoint[],
  seriesB: MonthlyDataPoint[]
): number | null => {
  const mapB = new Map(seriesB.map((p) => [p.date, p.value]));
  const pairs: [number, number][] = [];

  for (const p of seriesA) {
    const bVal = mapB.get(p.date);
    if (bVal !== undefined) {
      pairs.push([p.value, bVal]);
    }
  }

  if (pairs.length < 2) return null;

  const n = pairs.length;
  const meanA = pairs.reduce((s, [a]) => s + a, 0) / n;
  const meanB = pairs.reduce((s, [, b]) => s + b, 0) / n;

  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;

  for (const [a, b] of pairs) {
    const dA = a - meanA;
    const dB = b - meanB;
    sumAB += dA * dB;
    sumA2 += dA * dA;
    sumB2 += dB * dB;
  }

  const denom = Math.sqrt(sumA2 * sumB2);
  if (denom === 0) return null;

  return sumAB / denom;
};
