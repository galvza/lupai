/**
 * Toggles de indicadores em formato de pills clicáveis, agrupados por categoria.
 *
 * Categorias:
 * - Financeiro: Selic, Dólar, Endividamento, Inadimplência
 * - Preços: IPCA, Cesta Básica, Gasolina, Aluguel, Energia
 * - Atividade: Sal. Mínimo, Desemprego, PIB
 *
 * Pill ativa: borda colorida e fundo sutil. Inativa: cinza.
 */

import type { IndicatorKey } from "@/types/indicator";
import { INDICATOR_CONFIG } from "@/utils/constants";

type Category = {
  label: string;
  keys: IndicatorKey[];
};

const CATEGORIES: Category[] = [
  {
    label: "Financeiro",
    keys: ["selic", "dolar", "endividamento", "inadimplencia"],
  },
  {
    label: "Preços",
    keys: ["ipca", "cestaBasica", "gasolina", "aluguel", "energiaEletrica"],
  },
  {
    label: "Atividade",
    keys: ["salarioMinimo", "desemprego", "pib"],
  },
];

type IndicatorToggleProps = {
  /** Set de indicadores ativos. */
  activeIndicators: Set<IndicatorKey>;
  /** Callback pra ligar/desligar indicador. */
  onToggle: (key: IndicatorKey) => void;
};

/** Pills clicáveis agrupadas por categoria pra alternar indicadores no gráfico. */
const IndicatorToggle = ({
  activeIndicators,
  onToggle,
}: IndicatorToggleProps) => {
  return (
    <div className="font-ui" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {CATEGORIES.map((cat) => (
        <div key={cat.label} style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "var(--fs-micro)",
              fontWeight: 500,
              color: "var(--text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              minWidth: "72px",
              flexShrink: 0,
            }}
          >
            {cat.label}
          </span>
          {cat.keys.map((key) => {
            const config = INDICATOR_CONFIG[key];
            const active = activeIndicators.has(key);
            return (
              <button
                key={key}
                onClick={() => onToggle(key)}
                aria-pressed={active}
                aria-label={`${active ? "Desativar" : "Ativar"} indicador ${config.shortLabel}`}
                style={{
                  padding: "3px 10px",
                  borderRadius: "16px",
                  border: `1.5px solid ${active ? config.color : "var(--border)"}`,
                  background: active ? `${config.color}15` : "transparent",
                  color: active ? config.color : "var(--text-tertiary)",
                  fontSize: "var(--fs-label)",
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  lineHeight: 1.5,
                  whiteSpace: "nowrap",
                }}
              >
                {config.shortLabel}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default IndicatorToggle;
