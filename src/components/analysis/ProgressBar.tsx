"use client";

import { motion } from "framer-motion";

/** Barra de progresso animada */
export const ProgressBar = ({ progress }: { progress: number }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-[#666]">Progresso</span>
        <span className="text-[12px] text-[#666]">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
