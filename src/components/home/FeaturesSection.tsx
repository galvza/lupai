"use client";

import { Search, Play, TrendingUp, Target } from "lucide-react";
import { motion } from "framer-motion";
import { useAnimationSafety } from "@/hooks/useAnimationSafety";

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
  const forceVisible = useAnimationSafety(2000);

  return (
    <section id="features" className="bg-gradient-to-b from-[#F8F7F4] to-[#F0EFE9] py-16 md:py-20 px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={forceVisible ? { opacity: 1 } : undefined}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.1 }}
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
              animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`flex gap-4 rounded-xl p-4 -m-4 cursor-default transition-all duration-300 hover:border-[#C8FF3C]/30 hover:shadow-lg hover:scale-[1.02] ${i === 0 ? "border border-[#C8FF3C]/20" : "border border-transparent"}`}
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#C8FF3C]/10 flex items-center justify-center">
                <Icon color="#1A1A1A" size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <span className="bg-[#C8FF3C]/10 text-[#1A1A1A] text-xs font-mono px-2 py-0.5 rounded-full inline-block mb-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-1.5">
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
