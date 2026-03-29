import { Megaphone, Image, Play } from "lucide-react";
import type { UICompetitor as Competitor } from "@/types/ui";

/** Seção Anúncios Ativos (fundo claro) */
export const AdsSection = ({ competitor }: { competitor: Competitor }) => {
  if (!competitor.ads || competitor.ads.length === 0) return null;

  return (
    <section className="bg-light-bg px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Megaphone color="#1A1A1A" size={18} strokeWidth={1.5} />
          <h3 className="text-[13px] font-semibold text-[#1A1A1A]">
            Anúncios ativos
          </h3>
        </div>
        <p className="text-[11px] text-[#999] mb-5 ml-7">Meta Ads Library</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {competitor.ads.map((ad, i) => (
            <div
              key={i}
              className="bg-light-card border border-light-border rounded-xl overflow-hidden"
            >
              {/* Thumbnail placeholder */}
              <div className="bg-[#F0F0EC] h-32 flex items-center justify-center">
                {ad.format.toLowerCase().includes("vídeo") ? (
                  <Play color="#999" size={24} strokeWidth={1.5} />
                ) : (
                  <Image color="#999" size={24} strokeWidth={1.5} />
                )}
              </div>
              <div className="p-3">
                <p className="text-[11px] text-[#333] leading-relaxed mb-2">
                  {ad.copy}
                </p>
                <p className="text-[10px] text-[#999]">
                  {ad.format} · {ad.duration}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[12px] text-[#999] mt-4">
          Mostrando {competitor.ads.length} de {competitor.metrics.activeAds} ·{" "}
          <button className="text-accent hover:underline">Ver todos &rarr;</button>
        </p>
      </div>
    </section>
  );
};
