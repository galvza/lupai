"use client";

import { CompetitorHeader } from "@/components/dashboard/CompetitorHeader";
import { SiteSeoSection } from "@/components/dashboard/SiteSeoSection";
import { SocialSection } from "@/components/dashboard/SocialSection";
import { AdsSection } from "@/components/dashboard/AdsSection";
import { LessonsSection } from "@/components/dashboard/LessonsSection";
import { Footer } from "@/components/layout/Footer";
import { DarkToLightDivider, LightToDarkDivider } from "@/components/ui/SectionDivider";
import { MOCK_ANALYSIS_RESULT } from "@/utils/mock-analysis";

/** Página deep dive de um concorrente */
export default function CompetitorDeepDivePage({
  params,
}: {
  params: { id: string; competitorId: string };
}) {
  const competitor = MOCK_ANALYSIS_RESULT.competitors.find(
    (c) => c.id === params.competitorId
  );

  if (!competitor) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <p className="text-[#666] text-[14px]">Concorrente não encontrado.</p>
      </div>
    );
  }

  return (
    <main>
      <CompetitorHeader competitor={competitor} analysisId={params.id} />
      <DarkToLightDivider />
      <SiteSeoSection competitor={competitor} />
      <LightToDarkDivider />
      <SocialSection competitor={competitor} />
      <DarkToLightDivider />
      <AdsSection competitor={competitor} />
      <LightToDarkDivider />
      <LessonsSection competitor={competitor} />
      <Footer />
    </main>
  );
}
