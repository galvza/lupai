"use client";

import { use } from "react";
import { CompetitorHeader } from "@/components/dashboard/CompetitorHeader";
import { SiteSeoSection } from "@/components/dashboard/SiteSeoSection";
import { SocialSection } from "@/components/dashboard/SocialSection";
import { AdsSection } from "@/components/dashboard/AdsSection";
import { LessonsSection } from "@/components/dashboard/LessonsSection";
import { Footer } from "@/components/layout/Footer";
import { MOCK_ANALYSIS_RESULT } from "@/utils/mock-analysis";

/** Página deep dive de um concorrente */
export default function CompetitorDeepDivePage({
  params,
}: {
  params: Promise<{ id: string; competitorId: string }>;
}) {
  const { id, competitorId } = use(params);
  const competitor = MOCK_ANALYSIS_RESULT.competitors.find(
    (c) => c.id === competitorId
  );

  if (!competitor) {
    return (
      <div className="min-h-screen bg-[#F2F1ED] flex items-center justify-center">
        <p className="text-[#666] text-[14px]">Concorrente não encontrado.</p>
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
