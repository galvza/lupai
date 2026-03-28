"use client";

import { Search, Play, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: Search,
    title: "Concorrentes",
    description:
      "Descobre 3-4 concorrentes reais do seu nicho. Analisa site, SEO, redes sociais e anúncios ativos.",
  },
  {
    icon: Play,
    title: "Virais do nicho",
    description:
      "Top 10 vídeos virais do TikTok e Reels. Transcrição e análise de padrões de copy.",
  },
  {
    icon: TrendingUp,
    title: "Roteiros prontos",
    description:
      "Scripts de vídeo com gancho, corpo e CTA. Modelados dos padrões que viralizam no seu nicho.",
  },
  {
    icon: Target,
    title: "Recomendações",
    description:
      "Ações priorizadas com impacto e dificuldade. Específicas pro seu negócio, nunca genéricas.",
  },
];

/** Seção de features — grid 2x2 */
export const FeaturesSection = () => {
  return (
    <section className="bg-light-bg py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-[11px] text-[#999] uppercase tracking-widest text-center mb-12"
        >
          O QUE O LUPAI ENTREGA
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex gap-4"
            >
              <div className="shrink-0 mt-1">
                <Icon color="#C8FF3C" size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-1">
                  {title}
                </h3>
                <p className="text-[12px] text-[#999] leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
