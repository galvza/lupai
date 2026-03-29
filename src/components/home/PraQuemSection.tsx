"use client";

import { CheckSquare, User, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useAnimationSafety } from "@/hooks/useAnimationSafety";

const AUDIENCES = [
  {
    icon: CheckSquare,
    title: "Profissional de agência",
    body: "Seu cliente acabou de fechar contrato. Em vez de passar 2 dias pesquisando o mercado dele, você abre o LupAI e em 5 minutos tem o briefing completo com concorrentes mapeados, gaps identificados e ideias de conteúdo prontas. Onboarding que impressiona.",
  },
  {
    icon: User,
    title: "Dono de negócio",
    body: "Você sabe que seus concorrentes estão à frente, mas não sabe exatamente o quê eles fazem diferente. O LupAI mostra: onde eles aparecem, o que anunciam, que conteúdo funciona no seu mercado, e por onde você deveria começar.",
  },
  {
    icon: Zap,
    title: "Freelancer & criador de conteúdo",
    body: "Você gerencia múltiplos clientes ou cria conteúdo pra marcas. Precisa de inteligência competitiva rápida sem ter tempo — ou budget — pra ferramentas enterprise.",
  },
];

/** Seção "Pra quem é" com cards de audiência */
export const PraQuemSection = () => {
  const forceVisible = useAnimationSafety(2000);

  return (
    <section id="pra-quem" className="bg-gradient-to-b from-[#F8F7F4] to-[#F0EFE9] py-16 md:py-20 px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          className="font-serif text-2xl md:text-3xl lg:text-4xl text-[#1A1A1A] text-center mb-12 md:mb-16"
        >
          Se você faz marketing, isso é{" "}
          <em className="italic">pra você</em>.
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AUDIENCES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={forceVisible ? { opacity: 1, y: 0 } : undefined}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-light-card border border-light-border rounded-xl p-6 transition-all duration-300 hover:border-[#C8FF3C]/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon color="#1A1A1A" size={20} strokeWidth={1.5} />
                <h3 className="text-[14px] font-semibold text-[#1A1A1A]">
                  {title}
                </h3>
              </div>
              <p className="text-[13px] text-[#666] leading-relaxed">
                {body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
