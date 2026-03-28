import { Share2 } from "lucide-react";
import type { Competitor } from "@/types/analysis";

/** Seção Redes Sociais (fundo escuro) */
export const SocialSection = ({ competitor }: { competitor: Competitor }) => {
  if (!competitor.socialAnalysis) return null;

  return (
    <section className="bg-dark-bg px-6 py-10 rounded-t-[32px] md:rounded-t-[48px] rounded-b-[32px] md:rounded-b-[48px] relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Share2 color="#C8FF3C" size={18} strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-white">
            Redes sociais
          </h3>
        </div>

        <p className="text-[13px] text-[#999] leading-relaxed mb-5">
          {competitor.socialAnalysis}
        </p>

        {competitor.platforms && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {competitor.platforms.map((platform) => (
              <div
                key={platform.name}
                className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-[13px] font-medium text-white mb-0.5">
                    {platform.name}
                  </p>
                  {platform.stats && (
                    <p className="text-[11px] text-[#666]">{platform.stats}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full ${
                    platform.status === "active"
                      ? "bg-positive-bg text-positive-text"
                      : "bg-negative-bg text-negative-text"
                  }`}
                >
                  {platform.status === "active" ? "Ativo" : "Ausente"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
