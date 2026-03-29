"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressBar } from "@/components/analysis/ProgressBar";
import { AnalysisTimeline } from "@/components/analysis/AnalysisTimeline";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import type { AnalysisStep } from "@/types/ui";

/** Mapeia status do backend para porcentagem de progresso */
const STATUS_PROGRESS: Record<string, number> = {
  pending: 5,
  processing: 15,
  discovering: 35,
  extracting: 65,
  completed: 100,
  failed: 0,
};

/** Deriva steps do timeline a partir do status do backend */
const deriveSteps = (status: string): AnalysisStep[] => [
  {
    id: "understand",
    title: "Entendimento do nicho",
    status: status === "pending" ? "active" : "completed",
    logs: [],
  },
  {
    id: "competitors",
    title: "Descoberta de concorrentes",
    status: status === "discovering"
      ? "active"
      : ["pending", "processing"].includes(status)
        ? "pending"
        : "completed",
    logs: [],
  },
  {
    id: "extraction",
    title: "Extraindo dados dos concorrentes",
    status: status === "extracting"
      ? "active"
      : ["pending", "processing", "discovering"].includes(status)
        ? "pending"
        : "completed",
    logs: [],
  },
  {
    id: "virals",
    title: "Buscando virais do nicho",
    subtitle: "TikTok e Reels dos últimos 90 dias",
    status: status === "extracting"
      ? "active"
      : ["pending", "processing", "discovering"].includes(status)
        ? "pending"
        : "completed",
    logs: [],
  },
  {
    id: "recommendations",
    title: "Gerando recomendações",
    subtitle: "Síntese com IA · Roteiros · Diagnóstico",
    status: status === "completed" ? "completed" : "pending",
    logs: [],
  },
];

/** Página de progresso da análise — client component */
export const AnalysisPageClient = ({ id }: { id: string }) => {
  const router = useRouter();
  const [status, setStatus] = useState<string>("pending");
  const [niche, setNiche] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [runId, setRunId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Read session data (stored by HeroInput on submit)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRunId(sessionStorage.getItem("lupai_runId"));
      setAccessToken(sessionStorage.getItem("lupai_accessToken"));
      setNiche(sessionStorage.getItem("lupai_niche") ?? "");
      setRegion(sessionStorage.getItem("lupai_region") ?? "");
    }
  }, []);

  // Trigger.dev Realtime for live progress
  const { run } = useRealtimeRun(runId ?? "", {
    accessToken: accessToken ?? "",
    enabled: !!runId && !!accessToken,
  });

  // Fallback polling via /api/analysis/[id]/status
  useEffect(() => {
    if (!id) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/analysis/${id}/status`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(data.status);
      } catch {
        /* silent fail, retry next interval */
      }
    };
    const interval = setInterval(poll, 3000);
    poll();
    return () => clearInterval(interval);
  }, [id]);

  // Effective status from Realtime OR polling
  const realtimeStatus = (run?.metadata as Record<string, unknown>)?.status as string | undefined;
  const effectiveStatus = realtimeStatus || status;

  // Redirect to results when completed
  useEffect(() => {
    if (effectiveStatus === "completed") {
      router.push(`/analysis/${id}?view=results`);
    }
  }, [effectiveStatus, id, router]);

  // Failed state
  if (effectiveStatus === "failed") {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="font-serif text-[22px] text-white mb-2">Erro na análise</h2>
          <p className="text-[13px] text-[#666] mb-6">
            Algo deu errado durante a análise. Tente novamente.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-accent text-dark-bg text-[13px] font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // Derive UI data from status (fallback) or Realtime (richer)
  const realtimeProgress = (run?.metadata as Record<string, unknown>)?.progress as number | undefined;
  const realtimeSteps = (run?.metadata as Record<string, unknown>)?.steps as AnalysisStep[] | undefined;
  const displayProgress = realtimeProgress ?? (STATUS_PROGRESS[effectiveStatus] ?? 15);
  const displaySteps = realtimeSteps ?? deriveSteps(effectiveStatus);
  const displayNiche = ((run?.metadata as Record<string, unknown>)?.niche as string) ?? niche;
  const displayRegion = ((run?.metadata as Record<string, unknown>)?.region as string) ?? region;

  // Initial loading (no status yet)
  if (!effectiveStatus || effectiveStatus === "pending") {
    if (!niche && !displayNiche) {
      return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="font-serif text-[22px] sm:text-[26px] text-white mb-2">
          Analisando seu <em className="italic text-accent">mercado</em>
        </h1>
        <p className="text-[13px] text-[#666]">
          {displayNiche}
          {displayRegion ? ` · ${displayRegion}` : ""}
        </p>
      </div>

      <ProgressBar progress={displayProgress} />
      <AnalysisTimeline steps={displaySteps} />
    </div>
  );
};
