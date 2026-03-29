"use client";

import { Lightbulb, Link, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TipType = "short" | "url" | "long" | null;

/** Detecta o tipo de dica baseado no texto digitado */
export function detectTipType(text: string): TipType {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const hasUrl =
    trimmed.includes("http") ||
    trimmed.includes("www.") ||
    trimmed.includes(".com");
  if (hasUrl) return "url";

  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 8) return "long";
  if (wordCount >= 1) return "short";

  return null;
}

const TIPS: Record<
  NonNullable<TipType>,
  { icon: typeof Lightbulb; text: string }
> = {
  short: {
    icon: Lightbulb,
    text: "Adicione sua região e tipo de negócio para resultados melhores",
  },
  url: {
    icon: Link,
    text: "Ótimo! Vamos analisar seu site primeiro",
  },
  long: {
    icon: FileText,
    text: "Perfeito — quanto mais detalhes, melhor nossa análise",
  },
};

/** Dica contextual que aparece enquanto o usuário digita */
export const InlineTip = ({ tipType }: { tipType: TipType }) => {
  return (
    <AnimatePresence mode="wait">
      {tipType && (
        <motion.div
          key={tipType}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex items-center gap-2 mt-3"
        >
          {(() => {
            const tip = TIPS[tipType];
            const Icon = tip.icon;
            return (
              <>
                <Icon color="#C8FF3C" size={14} strokeWidth={1.5} />
                <span className="text-[12px] text-[#888]">{tip.text}</span>
              </>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
