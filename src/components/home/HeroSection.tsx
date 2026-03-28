"use client";

import { motion } from "framer-motion";
import { Nav } from "@/components/layout/Nav";
import { FirstTimeBanner } from "./FirstTimeBanner";
import { HeroInput } from "./HeroInput";

/** Seção hero com headline, input e banner */
export const HeroSection = () => {
  return (
    <section id="hero" className="bg-dark-bg min-h-[90vh] flex flex-col">
      <Nav />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-16 pt-8">
        <FirstTimeBanner />

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-serif text-[32px] sm:text-[40px] text-white text-center leading-tight max-w-2xl mb-4"
        >
          Veja tudo que seus concorrentes fazem online.{" "}
          <em className="italic text-accent">Domine</em> seu nicho.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="text-[15px] text-[#888] text-center max-w-lg mb-10 leading-relaxed"
        >
          Descreva seu nicho e receba análise competitiva, conteúdos virais e
          recomendações estratégicas — em minutos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="w-full flex justify-center"
        >
          <HeroInput />
        </motion.div>
      </div>
    </section>
  );
};
