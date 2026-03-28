"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAnimationSafety } from "@/hooks/useAnimationSafety";

const STEPS = [
  {
    number: "1",
    title: "Descreva",
    description:
      "Seu nicho, sua URL, ou só o nome do seu mercado. A IA entende qualquer formato.",
  },
  {
    number: "2",
    title: "Espere 5 minutos",
    description:
      "Enquanto você toma um café, o LupAI vasculha sites, redes sociais, anúncios e vídeos virais de 3-4 concorrentes.",
  },
  {
    number: "3",
    title: "Receba o mapa",
    description:
      "Diagnóstico competitivo, padrões virais e roteiros prontos. Tudo que uma agência cobraria milhares pra fazer.",
  },
];

/** Seção "Como funciona" com 3 passos */
export const ComoFuncionaSection = () => {
  const forceVisible = useAnimationSafety(2000);

  return (
    <section id="como-funciona" className="bg-gradient-to-b from-[#F8F7F4] to-[#F0EFE9] py-16 md:py-20 px-8 lg:px-16">
      <div className="max-w-6xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="font-serif text-2xl md:text-3xl lg:text-4xl text-[#1A1A1A] mb-3"
        >
          Quantas horas você ainda perde pesquisando{" "}
          <em className="italic">concorrente</em>?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={forceVisible ? { opacity: 1 } : undefined}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-sm md:text-base text-[#999] mb-12 md:mb-16"
        >
          Três passos. Cinco minutos. Nenhum trabalho manual.
        </motion.p>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-center gap-10">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.number}>
              {i > 0 && (
                <div className="hidden sm:block flex-shrink-0 border-t-2 border-dashed border-[#D4D0C8] w-16 mt-6" />
              )}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.15 }}
                className="flex flex-col items-center flex-1"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#1A1A1A] flex items-center justify-center mb-4">
                  <span className="text-[#1A1A1A] font-semibold text-lg">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-2">
                  {step.title}
                </h3>
                <p className="text-[12px] text-[#999] leading-relaxed max-w-[260px]">
                  {step.description}
                </p>
              </motion.div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
