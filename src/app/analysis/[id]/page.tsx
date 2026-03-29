"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AnalysisPageClient } from "./AnalysisPageClient";
import { DashboardResultsClient } from "./DashboardResultsClient";

function AnalysisContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view === "results") {
    return <DashboardResultsClient id={id} />;
  }

  return <AnalysisPageClient id={id} />;
}

/** Página de análise — progresso ou resultados */
export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#C8FF3C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AnalysisContent id={id} />
    </Suspense>
  );
}
