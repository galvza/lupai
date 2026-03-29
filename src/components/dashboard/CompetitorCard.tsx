"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { UICompetitor as Competitor } from "@/types/ui";

/** Card resumo de um concorrente */
export const CompetitorCard = ({
  competitor,
  analysisId,
}: {
  competitor: Competitor;
  analysisId: string;
}) => {
  return (
    <Link
      href={`/analysis/${analysisId}/competitor/${competitor.id}`}
      className="block bg-dark-card border border-dark-border rounded-xl p-4 hover:border-[#333] transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-medium text-white">{competitor.name}</h4>
        <ChevronRight size={14} className="text-[#555]" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-4">
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

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] text-[#666]">Score</p>
          <p className="text-[13px] font-semibold text-accent">
            {competitor.metrics.score}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#666]">Ads ativos</p>
          <p className="text-[13px] font-semibold text-white">
            {competitor.metrics.activeAds}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[#666]">Posts/sem</p>
          <p className="text-[13px] font-semibold text-white">
            {competitor.metrics.postsPerWeek}
          </p>
        </div>
      </div>
    </Link>
  );
};
