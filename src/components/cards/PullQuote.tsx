/**
 * Pull quote dinâmico sobre poder de compra do salário mínimo.
 *
 * Calcula quantas cestas básicas um salário mínimo comprava em 2005
 * vs hoje, interpolando os valores no texto editorial.
 * Mobile-first: font-size e padding responsivos via Tailwind.
 */

"use client";

import { useIndicators } from "@/hooks/useIndicators";
import { formatDecimal } from "@/utils/formatters";

/** Pull quote com dados de cestas básicas por salário mínimo. */
const PullQuote = () => {
  const { data } = useIndicators(["salarioMinimo", "cestaBasica"]);
  const salario = data.salarioMinimo ?? [];
  const cesta = data.cestaBasica ?? [];

  if (salario.length < 2 || cesta.length < 2) return null;

  const cestas2005 = salario[0].value / cesta[0].value;
  const cestasAtual =
    salario[salario.length - 1].value / cesta[cesta.length - 1].value;
  const anoAtual = cesta[cesta.length - 1].date.split("-")[0];

  return (
    <blockquote
      className="pl-4 sm:pl-5"
      style={{
        borderLeft: "3px solid var(--border)",
        margin: "0 0 8px 0",
      }}
    >
      <p
        className="text-[15px] sm:text-base"
        style={{
          color: "var(--text-primary)",
        }}
      >
        Em 2005, um salário mínimo comprava{" "}
        <strong>{formatDecimal(cestas2005, 1)}</strong> cestas básicas em São
        Paulo. Em {anoAtual}, compra{" "}
        <strong>{formatDecimal(cestasAtual, 1)}</strong>. O mais básico melhorou.
        Mas pergunte pro cara que paga aluguel em capital se ele tá vivendo
        melhor. O mínimo compra mais arroz e feijão — isso os dados mostram. O
        que eles não mostram é o que ficou mais caro sem ninguém medir direito.
      </p>
      <p
        className="font-ui"
        style={{
          fontSize: "var(--fs-label)",
          color: "var(--text-tertiary)",
          marginTop: "8px",
          fontStyle: "normal",
        }}
      >
        Fonte: Cálculo com dados oficiais do BCB e DIEESE
      </p>
    </blockquote>
  );
};

export default PullQuote;
