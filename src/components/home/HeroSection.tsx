"use client";

import { motion } from "framer-motion";
import { FirstTimeBanner } from "./FirstTimeBanner";
import { HeroInput } from "./HeroInput";

/** Seção hero com headline, input e cantos arredondados */
export const HeroSection = () => {
  return (
    <section
      id="hero"
      className="bg-dark-bg rounded-b-[32px] md:rounded-b-[48px] relative z-10"
    >
      <div className="flex flex-col items-center px-8 lg:px-16 pt-20 md:pt-28 pb-10 md:pb-14">
        <FirstTimeBanner />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white text-center leading-tight max-w-4xl mb-6"
        >
          Veja tudo que seus concorrentes fazem online.{" "}
          <em className="italic text-accent">Domine</em> seu nicho.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="text-sm md:text-base lg:text-lg text-[#888] text-center max-w-xl mb-10 md:mb-12 leading-relaxed"
        >
          Descreva seu nicho e receba análise competitiva, conteúdos virais e
          recomendações estratégicas — em minutos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="w-full max-w-2xl mx-auto"
        >
          <HeroInput />
        </motion.div>
      </div>
    </section>
  );
};
