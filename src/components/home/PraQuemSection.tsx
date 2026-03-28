"use client";

import { CheckSquare, User } from "lucide-react";
import { motion } from "framer-motion";

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
];

/** Seção "Pra quem é" com cards de audiência */
export const PraQuemSection = () => {
  return (
    <section id="pra-quem" className="bg-light-bg py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="font-serif text-[24px] sm:text-[28px] text-[#1A1A1A] text-center mb-12"
        >
          Se você faz marketing, isso é{" "}
          <em className="italic">pra você</em>.
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {AUDIENCES.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.15 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="bg-light-card border border-light-border rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Icon color="#C8FF3C" size={20} strokeWidth={1.5} />
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
