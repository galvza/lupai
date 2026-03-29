"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Store, ShoppingCart, Link as LinkIcon, ArrowRight } from "lucide-react";
import { useRotatingPlaceholder } from "@/hooks/useRotatingPlaceholder";
import { InlineTip, detectTipType } from "./InlineTip";

const HELPER_CHIPS = [
  { icon: Store, label: "Negócio local" },
  { icon: ShoppingCart, label: "E-commerce" },
  { icon: LinkIcon, label: "Tenho URL" },
];

/** Input principal do hero com textarea, chips, modo toggle e dica inline */
export const HeroInput = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"rapido" | "completo">("rapido");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { placeholder, visible } = useRotatingPlaceholder();
  const router = useRouter();

  const tipType = detectTipType(query);

  const handleSubmit = async () => {
    if (!query.trim() && !url.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          url: mode === "completo" ? url.trim() : undefined,
          mode,
        }),
      });

      if (!res.ok) throw new Error("Erro ao iniciar análise");
      const data = await res.json();
      router.push(`/analysis/${data.id}`);
    } catch {
      setIsSubmitting(false);
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  const handleChipClick = (label: string) => {
    setSelectedChip(label);
    if (label === "Tenho URL") {
      setMode("completo");
    } else {
      setQuery((prev) => (prev ? `${prev} — ${label.toLowerCase()}` : label.toLowerCase()));
      setTimeout(autoResize, 0);
    }
  };

  return (
    <div id="hero-input" className="w-full">
      {/* Textarea */}
      <div className={`relative bg-[#1A1A1A] border rounded-xl py-2.5 px-3 transition-all duration-300 shadow-[0_0_20px_rgba(200,255,60,0.05)] ${
        isFocused && !query.trim() ? "border-pulse border-[#333]" : "border-[#333]"
      } focus-within:border-[#C8FF3C]/50 focus-within:shadow-[0_0_15px_rgba(200,255,60,0.1)]`}>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedChip(null); autoResize(); }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={visible ? placeholder : ""}
          rows={1}
          className="w-full bg-transparent text-white text-sm md:text-base lg:text-lg placeholder:text-[#888] resize-none outline-none leading-relaxed min-h-[40px] max-h-[120px] overflow-hidden pr-28 md:pr-32"
          style={{
            transition: "opacity 0.3s ease",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (!query.trim() && !url.trim())}
          className={`absolute bottom-2.5 right-3 text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${
            isSubmitting || (!query.trim() && !url.trim())
              ? "bg-[#333] text-[#666] cursor-not-allowed"
              : "bg-accent text-dark-bg hover:brightness-110"
          }`}
        >
          {isSubmitting ? "Analisando..." : "Analisar"}
          {!isSubmitting && <ArrowRight size={14} strokeWidth={2} />}
        </button>
      </div>

      {/* Inline tip */}
      <InlineTip tipType={tipType} />

      {/* Helper chips */}
      <div className="flex flex-wrap gap-3 mt-4">
        {HELPER_CHIPS.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => handleChipClick(label)}
            className={`inline-flex items-center gap-1.5 bg-[#1F1F1F] text-[12px] px-3 py-1.5 rounded-full transition-all duration-200 ${
                selectedChip === label
                  ? "border border-[#C8FF3C] bg-[#C8FF3C]/10 text-white"
                  : "border border-[#333] text-[#555] hover:border-[#555]"
              }`}
          >
            <Icon size={12} strokeWidth={1.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setMode("rapido")}
          className={`text-[12px] px-3 py-1 rounded-full transition-all ${
            mode === "rapido"
              ? "bg-[#1A1A1A] text-accent border border-accent/30"
              : "text-[#555] hover:text-[#888]"
          }`}
        >
          Modo Rápido
        </button>
        <span className="text-[#333] text-[12px]">|</span>
        <button
          onClick={() => setMode("completo")}
          className={`text-[12px] px-3 py-1 rounded-full transition-all ${
            mode === "completo"
              ? "bg-[#1A1A1A] text-accent border border-accent/30"
              : "text-[#555] hover:text-[#888]"
          }`}
        >
          Modo Completo
        </button>
      </div>
      <p className="text-[#666] text-xs mt-1 transition-opacity duration-200">
        {mode === "rapido"
          ? "Descreva seu nicho — análise em ~2 min"
          : "Nicho + sua URL — análise comparativa em ~5 min"}
      </p>

      {/* URL input for Modo Completo */}
      {mode === "completo" && (
        <div className="mt-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL do seu site (opcional)"
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-lg px-4 py-2.5 text-white text-[13px] placeholder:text-[#555] outline-none focus:border-accent/40 transition-colors"
          />
        </div>
      )}
    </div>
  );
};
