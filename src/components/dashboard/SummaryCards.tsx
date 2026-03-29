"use client";

import { useState } from "react";
import { Search, Play, TrendingUp } from "lucide-react";
import type { SummaryCard } from "@/types/ui";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  play: Play,
  trending: TrendingUp,
};

/** Card resumo de gap/viral/roteiro com expand/collapse */
const SummaryCardItem = ({ card }: { card: SummaryCard }) => {
  const Icon = ICON_MAP[card.icon] || Search;
  const [expanded, setExpanded] = useState(false);
  const hasExpanded = card.expandedItems && card.expandedItems.length > 0;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon color="#C8FF3C" size={16} strokeWidth={1.5} />
        <span className="text-[12px] text-[#666]">{card.label}</span>
      </div>
      <p className="text-[24px] font-semibold text-accent mb-1">{card.value}</p>
      <p className="text-[11px] text-[#666] mb-3">{card.subtitle}</p>

      <div
        className="transition-all duration-300 overflow-hidden"
        style={{ maxHeight: expanded ? "2000px" : "60px" }}
      >
        {expanded && hasExpanded ? (
          <div className="space-y-3">
            {card.expandedItems!.map((item, i) => (
              <div key={i} className="text-[12px] text-[#999] leading-relaxed">
                {item.split("\n").map((line, j) => (
                  <p key={j} className={j === 0 ? "text-[#CCC] font-medium" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-[#999] leading-relaxed">
            {card.preview}
          </p>
        )}
      </div>

      {hasExpanded && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-[12px] text-accent hover:underline"
        >
          {expanded ? "Ver menos \u2191" : "Ver mais \u2192"}
        </button>
      )}
    </div>
  );
};

/** Grid de 3 cards de resumo */
export const SummaryCards = ({
  gaps,
  virals,
  scripts,
}: {
  gaps: SummaryCard;
  virals: SummaryCard;
  scripts: SummaryCard;
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <SummaryCardItem card={gaps} />
      <SummaryCardItem card={virals} />
      <SummaryCardItem card={scripts} />
    </div>
  );
};
