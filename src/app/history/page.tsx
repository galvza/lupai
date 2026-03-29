"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ShoppingCart,
  Sparkles,
  Shirt,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { mapSummaryToHistoryItem } from "@/utils/api-to-ui-mappers";
import type { HistoryItem } from "@/types/ui";

const ICON_MAP: Record<string, typeof ShoppingCart> = {
  "shopping-cart": ShoppingCart,
  sparkles: Sparkles,
  shirt: Shirt,
};

const HistoryCard = ({ item }: { item: HistoryItem }) => {
  const Icon = ICON_MAP[item.icon] || ShoppingCart;
  const isComplete = item.status === "complete";

  return (
    <Link
      href={
        isComplete
          ? `/analysis/${item.id}?view=results`
          : `/analysis/${item.id}`
      }
      className="flex items-center gap-4 bg-light-card border border-light-border rounded-xl p-4 hover:border-[#D8D8D4] transition-colors"
    >
      {/* Icon */}
      <div className="w-10 h-10 bg-[#F4F4F0] rounded-lg flex items-center justify-center shrink-0">
        <Icon color="#1A1A1A" size={18} strokeWidth={1.5} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-medium text-[#1A1A1A] truncate">
          {item.niche}
        </h3>
        <p className="text-[11px] text-[#999] truncate">{item.metadata}</p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[11px] text-[#999]">{item.date}</p>
          <p className="text-[10px] text-[#BBB]">{item.relativeTime}</p>
        </div>
        <span
          className={`text-[10px] px-2.5 py-0.5 rounded-full ${
            isComplete
              ? "bg-success-bg text-success-text"
              : "bg-warning-light-bg text-warning-light-text"
          }`}
        >
          {isComplete ? "Completa" : "Em andamento"}
        </span>
        <ChevronRight size={14} className="text-[#999]" />
      </div>
    </Link>
  );
};

/** Página de histórico de análises */
export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) throw new Error("Erro ao carregar histórico");
        const data = await res.json();
        setItems((data.analyses ?? []).map(mapSummaryToHistoryItem));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar histórico");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-dark-bg">
        <div className="px-6 pb-8 pt-20 max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-[22px] sm:text-[26px] text-white">
              Suas <em className="italic text-accent">análises</em>
            </h1>
            <p className="text-[12px] text-[#666] mt-1">
              {loading
                ? "Carregando..."
                : `${items.length} análise${items.length !== 1 ? "s" : ""} realizadas`}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-accent text-dark-bg text-[13px] font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            <Plus size={14} strokeWidth={2} />
            Nova análise
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="bg-light-bg flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-light-card border border-light-border rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-16">
              <p className="text-[14px] text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-[13px] text-accent hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && items.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}

          {!loading && !error && items.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[14px] text-[#999]">
                Nenhuma análise ainda. Comece descrevendo seu nicho.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
