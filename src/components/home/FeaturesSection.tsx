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
    <section className="bg-light-bg py-20 lg:py-24 px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[3px] mb-4">
            O QUE O LUPAI ENTREGA
          </p>
          <div className="w-10 h-0.5 bg-[#1A1A1A] mx-auto" />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
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
                <Icon color="#1A1A1A" size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1.5">
                  {title}
                </h3>
                <p className="text-sm text-[#999] leading-relaxed">
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
