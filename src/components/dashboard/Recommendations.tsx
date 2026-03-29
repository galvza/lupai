import { Target, ChevronRight } from "lucide-react";
import type { UIRecommendation as Recommendation } from "@/types/ui";

const IMPACT_STYLES: Record<string, string> = {
  ALTO: "bg-positive-bg text-positive-text",
  "MÉDIO": "bg-warning-dark-bg text-warning-dark-text",
  BAIXO: "bg-[#1A1A1A] text-[#888]",
};

/** Seção de recomendações priorizadas */
export const Recommendations = ({
  recommendations,
  total,
}: {
  recommendations: Recommendation[];
  total: number;
}) => {
  const hiddenCount = total - recommendations.length;

  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target color="#C8FF3C" size={16} strokeWidth={1.5} />
        <h3 className="text-[14px] font-medium text-white">
          Recomendações priorizadas
        </h3>
        <ChevronRight size={14} className="text-[#555] ml-auto" />
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-start gap-3">
            <span
              className={`shrink-0 inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                IMPACT_STYLES[rec.impact] || IMPACT_STYLES.BAIXO
              }`}
            >
              {rec.impact}
            </span>
            <p className="text-[12px] text-[#CCC] leading-relaxed">
              {rec.text}
            </p>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button className="mt-4 text-[12px] text-accent hover:underline">
          +{hiddenCount} recomendações · Ver todas &rarr;
        </button>
      )}
    </div>
  );
};
