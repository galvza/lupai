import { Search, Play, TrendingUp } from "lucide-react";
import type { SummaryCard } from "@/types/ui";

const ICON_MAP: Record<string, typeof Search> = {
  search: Search,
  play: Play,
  trending: TrendingUp,
};

/** Card resumo de gap/viral/roteiro */
const SummaryCardItem = ({ card }: { card: SummaryCard }) => {
  const Icon = ICON_MAP[card.icon] || Search;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon color="#C8FF3C" size={16} strokeWidth={1.5} />
        <span className="text-[12px] text-[#666]">{card.label}</span>
      </div>
      <p className="text-[24px] font-semibold text-accent mb-1">{card.value}</p>
      <p className="text-[11px] text-[#666] mb-3">{card.subtitle}</p>
      <p className="text-[12px] text-[#999] leading-relaxed mb-3">
        {card.preview}
      </p>
      <button className="text-[12px] text-accent hover:underline">
        Ver mais &rarr;
      </button>
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
