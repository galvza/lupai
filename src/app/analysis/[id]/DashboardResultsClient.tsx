"use client";

import { useState, useEffect } from "react";
import { Download, RefreshCw } from "lucide-react";
import Link from "next/link";
import { LupaiLogo } from "@/components/ui/LupaiLogo";
import { MarketOverview } from "@/components/dashboard/MarketOverview";
import { CompetitorCard } from "@/components/dashboard/CompetitorCard";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Recommendations } from "@/components/dashboard/Recommendations";
import { Footer } from "@/components/layout/Footer";
import { mapResultsToUI } from "@/utils/api-to-ui-mappers";
import type { AnalysisResult } from "@/types/ui";

/** Dashboard de resultados da análise */
export const DashboardResultsClient = ({ id }: { id: string }) => {
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/analysis/${id}`);
        if (!res.ok) {
          throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }
        const raw = await res.json();
        setData(mapResultsToUI(raw));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar resultados");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
        <div className="w-full max-w-5xl">
          <div className="flex justify-center mb-6">
            <div className="animate-pulse">
              <LupaiLogo size={40} variant="green" />
            </div>
          </div>
          <p className="text-[#999] text-sm text-center mb-10">
            Preparando seu relatório...
          </p>
          <div className="space-y-4">
            <div className="bg-[#1A1A1A] rounded-xl h-32 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] rounded-xl h-28 animate-pulse" />
              <div className="bg-[#1A1A1A] rounded-xl h-28 animate-pulse" />
            </div>
            <div className="bg-[#1A1A1A] rounded-xl h-24 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-8">
            <LupaiLogo size={40} variant="green" />
          </div>
          <h2 className="font-serif text-[22px] text-white mb-2">
            Erro ao carregar resultados
          </h2>
          <p className="text-[14px] text-[#999] mb-8">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#C8FF3C] text-[#0F0F0F] rounded-full px-6 py-3 font-medium text-[14px] hover:brightness-110 transition-all"
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              className="text-[14px] text-[#999] hover:text-white transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-8">
            <LupaiLogo size={40} variant="green" />
          </div>
          <h2 className="font-serif text-[22px] text-white mb-2">
            Nenhum resultado encontrado
          </h2>
          <p className="text-[14px] text-[#999] mb-8">
            Esta análise pode ter expirado ou o ID é inválido.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#C8FF3C] text-[#0F0F0F] rounded-full px-6 py-3 font-medium text-[14px] hover:brightness-110 transition-all"
          >
            Iniciar nova análise
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="px-6 py-8 border-b border-dark-border">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-[22px] sm:text-[26px] text-white">
              {data.nicheKeyword}{" "}
              <em className="italic text-accent">{data.nicheAccent}</em>
            </h1>
            <p className="text-[12px] text-[#666] mt-1">
              {data.region} · {data.timestamp}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/report/${id}`}
              download
              className="inline-flex items-center gap-2 bg-dark-card border border-dark-border text-[#888] text-[11px] px-3 py-2 rounded-lg hover:border-[#444] transition-colors"
            >
              <Download size={12} strokeWidth={1.5} />
              Exportar PDF
            </a>
            <button className="inline-flex items-center gap-2 bg-dark-card border border-dark-border text-[#888] text-[11px] px-3 py-2 rounded-lg hover:border-[#444] transition-colors">
              <RefreshCw size={12} strokeWidth={1.5} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Market Overview */}
        <MarketOverview overview={data.marketOverview} />

        {/* Competitors */}
        <div className="mb-6">
          <p className="text-[11px] text-[#555] uppercase tracking-wider mb-4">
            CONCORRENTES
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.competitors.map((comp) => (
              <CompetitorCard key={comp.id} competitor={comp} analysisId={id} />
            ))}
          </div>
        </div>

        {/* Gaps + Virals + Scripts */}
        <SummaryCards
          gaps={data.gaps}
          virals={data.virals}
          scripts={data.scripts}
        />

        {/* Recommendations */}
        <Recommendations
          recommendations={data.recommendations}
          total={data.totalRecommendations}
        />
      </div>

      <Footer />
    </div>
  );
};
