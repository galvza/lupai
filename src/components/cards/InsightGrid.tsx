/**
 * Grid de 4 insight cards editoriais com dados dinâmicos.
 *
 * Cada card mostra um destaque numérico e texto narrativo sobre
 * salário, dólar, endividamento e inadimplência.
 * Usa InsightCard com cores contextuais (verde/vermelho).
 */

"use client";

import { useIndicators } from "@/hooks/useIndicators";
import { percentChange, findExtreme } from "@/utils/calculations";
import { formatDecimal, formatDollar } from "@/utils/formatters";
import InsightCard from "./InsightCard";

type InsightCardData = {
  title: string;
  value: string;
  body: string;
  sentiment?: "positive" | "negative";
};

/** Grid de 4 insight cards com dados econômicos e texto editorial. */
const InsightGrid = () => {
  const { data } = useIndicators([
    "salarioMinimo",
    "dolar",
    "endividamento",
    "inadimplencia",
  ]);

  const salario = data.salarioMinimo ?? [];
  const dolar = data.dolar ?? [];
  const endiv = data.endividamento ?? [];
  const inadim = data.inadimplencia ?? [];

  const varSalario =
    salario.length >= 2
      ? percentChange(salario[0].value, salario[salario.length - 1].value)
      : null;
  const endivMax = findExtreme(endiv, "max");
  const inadimMax = findExtreme(inadim, "max");

  const cards: InsightCardData[] = [
    {
      title: "O salário subiu, mas...",
      value: `+${formatDecimal(varSalario ?? 0, 0)}%`,
      body: "O mínimo quase quintuplicou em 20 anos. Mas vai no site de aluguel e procura um apartamento com esse salário. A matemática não fecha.",
      sentiment: "positive",
    },
    {
      title: "O elefante na sala",
      value: `${formatDollar(dolar[0]?.value)} → ${formatDollar(dolar[dolar.length - 1]?.value)}`,
      body: "O dólar mais que dobrou. Tudo que vem de fora — eletrônico, remédio importado, peça de carro, passagem aérea — ficou proporcionalmente mais caro. Quem viajou pra fora em 2005 sabe do que eu tô falando.",
      sentiment: "negative",
    },
    {
      title: "A conta que não fecha",
      value: `${formatDecimal(endivMax?.value, 1)}% da renda`,
      body: "O brasileiro deve quase metade do que ganha no ano inteiro. Recorde histórico. O salário subiu, mas a dívida subiu junto.",
      sentiment: "negative",
    },
    {
      title: "Quando param de pagar",
      value: `Pico de ${formatDecimal(inadimMax?.value, 1)}%`,
      body: "Inadimplência não é só número — é gente que parou de conseguir pagar. E quando muita gente para ao mesmo tempo, o sistema inteiro trava.",
      sentiment: "negative",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {cards.map((card) => (
        <InsightCard
          key={card.title}
          title={card.title}
          value={card.value}
          body={card.body}
          sentiment={card.sentiment}
        />
      ))}
    </div>
  );
};

export default InsightGrid;
