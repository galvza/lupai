"use client";

import { use, useState, useEffect } from "react";
import { CompetitorHeader } from "@/components/dashboard/CompetitorHeader";
import { SiteSeoSection } from "@/components/dashboard/SiteSeoSection";
import { SocialSection } from "@/components/dashboard/SocialSection";
import { AdsSection } from "@/components/dashboard/AdsSection";
import { LessonsSection } from "@/components/dashboard/LessonsSection";
import { Footer } from "@/components/layout/Footer";
import { mapCompetitorToUI } from "@/utils/api-to-ui-mappers";
import type { UICompetitor } from "@/types/ui";

/** Página deep dive de um concorrente */
export default function CompetitorDeepDivePage({
  params,
}: {
  params: Promise<{ id: string; competitorId: string }>;
}) {
  const { id, competitorId } = use(params);
  const [competitor, setCompetitor] = useState<UICompetitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompetitor = async () => {
      try {
        const res = await fetch(`/api/analysis/${id}`);
        if (!res.ok) throw new Error("Erro ao carregar dados");
        const data = await res.json();
        const found = data.competitors?.find(
          (c: { id: string }) => c.id === competitorId
        );
        if (!found) {
          setError("Concorrente não encontrado");
        } else {
          setCompetitor(mapCompetitorToUI(found));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitor();
  }, [id, competitorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F1ED] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !competitor) {
    return (
      <div className="min-h-screen bg-[#F2F1ED] flex items-center justify-center">
        <p className="text-[#666] text-[14px]">{error || "Concorrente não encontrado."}</p>
      </div>
    );
  }

  return (
    <main className="bg-light-bg">
      <CompetitorHeader competitor={competitor} analysisId={id} />
      <SiteSeoSection competitor={competitor} />
      <SocialSection competitor={competitor} />
      <AdsSection competitor={competitor} />
      <LessonsSection competitor={competitor} />
      <Footer />
    </main>
  );
}
