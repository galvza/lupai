import { Clock, ChevronRight } from "lucide-react";
import type { AnalysisResult, MarketSection } from "@/types/ui";

/** Renderiza uma seção parsed do strategic overview */
const SectionBlock = ({ section }: { section: MarketSection }) => (
  <div className="mb-5 last:mb-0">
    <h4 className="text-[14px] font-bold text-white mb-1">{section.title}</h4>
    {section.summary && (
      <p className="text-[13px] text-[#999] leading-relaxed mb-2">
        {section.summary}
      </p>
    )}
    {section.tags && section.tags.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-2">
        {section.tags.map((tag) => (
          <span
            key={tag}
            className="inline-block text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
    {section.detailedAnalysis && (
      <div className="text-[12px] text-[#888] leading-relaxed space-y-1">
        {section.detailedAnalysis.split("\n").filter(Boolean).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    )}
    {section.metrics && Object.keys(section.metrics).length > 0 && (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {Object.entries(section.metrics).map(([key, val]) => (
          <div key={key} className="bg-[#111] rounded-lg px-3 py-1.5">
            <span className="text-[10px] text-[#666] mr-1.5">
              {key.replace(/_/g, " ")}
            </span>
            <span className="text-[12px] font-medium text-white">
              {String(val)}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
);

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

      {overview.sections && overview.sections.length > 0 ? (
        <div className="mb-5">
          {overview.sections.map((section) => (
            <SectionBlock key={section.key} section={section} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#999] leading-relaxed mb-5">
          {overview.summary}
        </p>
      )}

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
