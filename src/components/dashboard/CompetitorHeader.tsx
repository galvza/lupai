"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { UICompetitor as Competitor } from "@/types/ui";

/** Header do deep dive com métricas */
export const CompetitorHeader = ({
  competitor,
  analysisId,
}: {
  competitor: Competitor;
  analysisId: string;
}) => {
  return (
    <section className="bg-dark-bg px-6 py-8 rounded-b-[32px] md:rounded-b-[48px] relative z-10">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link
          href={`/analysis/${analysisId}?view=results`}
          className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline mb-6"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
          Voltar ao overview
        </Link>

        {/* Name + URL */}
        <h1 className="font-serif text-[24px] sm:text-[28px] text-white mb-1">
          {competitor.name}
        </h1>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[12px] text-[#666]">{competitor.url}</span>
          <span className="text-[12px] text-accent font-semibold">
            Score: {competitor.metrics.score}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {competitor.tags.map((tag) => (
            <span
              key={tag.label}
              className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full ${
                tag.type === "positive"
                  ? "bg-positive-bg text-positive-text"
                  : "bg-negative-bg text-negative-text"
              }`}
            >
              {tag.label}
            </span>
          ))}
        </div>

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Tráfego/mês", value: competitor.metrics.monthlyTraffic || "N/A" },
            { label: "Seguidores IG", value: competitor.metrics.igFollowers || "N/A" },
            { label: "Ads ativos", value: String(competitor.metrics.activeAds), isGreen: true },
            { label: "Posts/semana", value: String(competitor.metrics.postsPerWeek) },
          ].map(({ label, value, isGreen }) => (
            <div key={label} className="bg-dark-card border border-dark-border rounded-xl p-3">
              <p className="text-[10px] text-[#666] mb-1">{label}</p>
              <p className={`text-[16px] font-semibold ${isGreen ? "text-accent" : "text-white"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
