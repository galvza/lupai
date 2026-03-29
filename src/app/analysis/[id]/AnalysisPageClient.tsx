"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/analysis/ProgressBar";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { usePolling } from "@/hooks/usePolling";
import { MOCK_ANALYSIS_STATUS } from "@/utils/mock-analysis";
import type { UIAnalysisStatus as AnalysisStatus } from "@/types/ui";

/** Página de progresso da análise — client component */
export const AnalysisPageClient = ({ id }: { id: string }) => {
  const router = useRouter();
  const [useMock, setUseMock] = useState(false);

  const shouldStop = useCallback(
    (data: AnalysisStatus) => data.status === "complete",
    []
  );

  const { data: liveData } = usePolling<AnalysisStatus>(
    useMock ? null : `/api/status/${id}`,
    3000,
    shouldStop
  );

  // Fallback to mock after first failed poll
  useEffect(() => {
    if (!liveData && !useMock) {
      const timer = setTimeout(() => setUseMock(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [liveData, useMock]);

  const data = liveData || (useMock ? MOCK_ANALYSIS_STATUS : null);

  // Redirect to results when complete
  useEffect(() => {
    if (data?.status === "complete") {
      router.push(`/analysis/${id}?view=results`);
    }
  }, [data?.status, id, router]);

  if (!data) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="font-serif text-[22px] sm:text-[26px] text-white mb-2">
          Analisando seu <em className="italic text-accent">mercado</em>
        </h1>
        <p className="text-[13px] text-[#666]">
          {data.niche}
          {data.region ? ` · ${data.region}` : ""}
        </p>
      </div>

      <ProgressBar progress={data.progress} />
      <AnalysisTimeline steps={data.steps} />
    </div>
  );
};
