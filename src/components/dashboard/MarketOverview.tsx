import { Clock, ChevronRight } from "lucide-react";
import type { AnalysisResult } from "@/types/ui";

/** Card de visão geral do mercado */
export const MarketOverview = ({
  overview,
}: {
  overview: AnalysisResult["marketOverview"];
}) => {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock color="#C8FF3C" size={16} strokeWidth={1.5} />
        <h3 className="text-[14px] font-medium text-white">Visão do mercado</h3>
        <ChevronRight size={14} className="text-[#555] ml-auto" />
      </div>

      <p className="text-[13px] text-[#999] leading-relaxed mb-5">
        {overview.summary}
      </p>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Competição", value: overview.competition },
          { label: "Tendência", value: overview.trend },
          { label: "Canais fortes", value: overview.strongChannels },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[11px] text-[#666] mb-0.5">{label}</p>
            <p className="text-[14px] font-semibold text-accent">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
