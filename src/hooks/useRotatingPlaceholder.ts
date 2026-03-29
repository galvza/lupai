"use client";

import { useState, useEffect, useRef } from "react";

const PLACEHOLDERS = [
  "ex: loja de suplementos esportivos em Campinas",
  "ex: clínica de estética no Rio de Janeiro",
  "ex: www.minhalojaonline.com.br",
  "ex: e-commerce de roupas femininas plus size",
  "ex: academia de crossfit em Curitiba",
];

/**
 * Hook que produz efeito typewriter nos placeholders.
 */
export function useRotatingPlaceholder() {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const currentPhrase = PLACEHOLDERS[phraseIndex];

    if (!isDeleting && charIndex <= currentPhrase.length) {
      timeoutRef.current = setTimeout(() => {
        setText(currentPhrase.slice(0, charIndex));
        setCharIndex((prev) => prev + 1);
      }, 40);
    } else if (!isDeleting && charIndex > currentPhrase.length) {
      timeoutRef.current = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
    } else if (isDeleting && charIndex > 0) {
      timeoutRef.current = setTimeout(() => {
        setCharIndex((prev) => prev - 1);
        setText(currentPhrase.slice(0, charIndex - 1));
      }, 25);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [charIndex, isDeleting, phraseIndex]);

  return { placeholder: text, visible: true };
}
