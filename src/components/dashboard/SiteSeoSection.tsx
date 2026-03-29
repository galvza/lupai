import { Globe } from "lucide-react";
import type { UICompetitor as Competitor } from "@/types/ui";

/** Seção Site & SEO (fundo claro) */
export const SiteSeoSection = ({ competitor }: { competitor: Competitor }) => {
  if (!competitor.siteAnalysis) return null;

  return (
    <section className="bg-light-bg px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Globe color="#1A1A1A" size={18} strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-[#1A1A1A]">
            Site & SEO
          </h3>
        </div>

        <p className="text-[13px] text-[#666] leading-relaxed mb-5">
          {competitor.siteAnalysis}
        </p>

        {competitor.seoMetrics && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Autoridade", value: String(competitor.seoMetrics.authority) },
              { label: "Top keywords", value: String(competitor.seoMetrics.topKeywords) },
              {
                label: "Velocidade",
                value: competitor.seoMetrics.speed,
                isGreen: competitor.seoMetrics.speed === "Rápido",
              },
            ].map(({ label, value, isGreen }) => (
              <div
                key={label}
                className="bg-light-card border border-light-border rounded-lg px-4 py-2"
              >
                <span className="text-[10px] text-[#999] mr-2">{label}</span>
                <span
                  className={`text-[12px] font-semibold ${
                    isGreen ? "text-accent" : "text-[#1A1A1A]"
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
