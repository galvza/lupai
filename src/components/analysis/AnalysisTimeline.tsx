"use client";

import type { AnalysisStep } from "@/types/ui";
import { TimelineStep } from "./TimelineStep";

/** Timeline completa da análise */
export const AnalysisTimeline = ({ steps }: { steps: AnalysisStep[] }) => {
  return (
    <div className="max-w-2xl mx-auto">
      {steps.map((step, i) => (
        <TimelineStep key={step.id} step={step} isLast={i === steps.length - 1} />
      ))}
    </div>
  );
};
