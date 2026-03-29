"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "lupai-hint-dismissed";

/** Dica sutil de primeira visita — desaparece após primeiro uso via localStorage */
export const FirstTimeBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setVisible(true);
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  if (!visible) return null;

  return (
    <p className="text-[13px] text-[#666] text-center max-w-2xl mx-auto mb-6">
      Descreva seu negócio ou nicho e receba sua análise competitiva completa.
    </p>
  );
};
