"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/** Seção CTA final */
export const CtaSection = () => {
  return (
    <section id="cta" className="bg-dark-bg py-20 lg:py-24 px-8 lg:px-16">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-serif text-2xl md:text-3xl lg:text-4xl text-white leading-tight mb-6"
        >
          De horas de pesquisa manual pra{" "}
          <em className="italic text-accent">minutos</em> de inteligência
          real.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-sm md:text-base text-[#666] mb-10"
        >
          Sem login. Sem cartão. Sem setup. Descreve e vai.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Link
            href="/#hero"
            className="inline-block bg-accent text-dark-bg text-[15px] font-semibold px-8 py-3 rounded-lg hover:brightness-110 transition-all"
          >
            Analisar meu mercado agora
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
