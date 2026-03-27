"use client";

import { useState, useEffect } from "react";

const PLACEHOLDERS = [
  "ex: loja de suplementos esportivos em Campinas",
  "ex: clínica de estética no Rio de Janeiro",
  "ex: www.minhalojaonline.com.br",
  "ex: e-commerce de roupas femininas plus size",
];

/**
 * Hook que rotaciona placeholders a cada `intervalMs` ms com fade.
 */
export function useRotatingPlaceholder(intervalMs: number = 3500) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
        setVisible(true);
      }, 300);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return { placeholder: PLACEHOLDERS[index], visible };
}
