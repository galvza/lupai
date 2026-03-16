/**
 * Cards de insight pra aluguel e desemprego.
 *
 * Calcula variação acumulada do FipeZAP e pico de desemprego
 * a partir dos dados dos hooks, com fallbacks pra quando os dados
 * ainda não estão disponíveis.
 */

"use client";

import { useIndicators } from "@/hooks/useIndicators";
import { compoundMonthlyRates, findExtreme } from "@/utils/calculations";
import { formatDecimal } from "@/utils/formatters";
import InsightCard from "./InsightCard";

/** Par de insight cards: aluguel (FipeZAP) e desemprego (PNAD). */
const HousingInsightCards = () => {
  const { data } = useIndicators(["aluguel", "desemprego"]);

  const aluguel = data.aluguel ?? [];
  const desemprego = data.desemprego ?? [];

  const varAluguel = compoundMonthlyRates(aluguel);
  const desempregoMax = findExtreme(desemprego, "max");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <InsightCard
        title="O teto que sobe"
        value={varAluguel !== null ? `+${formatDecimal(varAluguel, 0)}%` : "—"}
        body="O índice FipeZAP de aluguel em São Paulo desde 2008. A inflação oficial no mesmo período? Bem menos. Morar ficou mais caro que viver."
        sentiment="negative"
      />
      <InsightCard
        title="O termômetro do emprego"
        value={
          desempregoMax !== null
            ? `${formatDecimal(desempregoMax.value, 1)}%`
            : "—"
        }
        body="Pico de desemprego foi no primeiro trimestre de 2021, em plena pandemia. Mais de 1 em cada 7 brasileiros procurando trabalho e não achando."
        sentiment="negative"
      />
    </div>
  );
};

export default HousingInsightCards;
