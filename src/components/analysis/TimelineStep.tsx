import { Check } from "lucide-react";
import type { AnalysisStep } from "@/types/ui";
import { TerminalLog } from "./TerminalLog";

/** Um passo na timeline de análise */
export const TimelineStep = ({
  step,
  isLast,
}: {
  step: AnalysisStep;
  isLast: boolean;
}) => {
  const isCompleted = step.status === "completed";
  const isActive = step.status === "active";

  return (
    <div className="relative flex gap-4">
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-[11px] top-[28px] bottom-0 w-[1px] bg-[#2A2A2A]" />
      )}

      {/* Círculo do passo */}
      <div className="relative z-10 shrink-0 mt-0.5">
        {isCompleted ? (
          <div className="w-[24px] h-[24px] rounded-full bg-accent flex items-center justify-center">
            <Check color="#0F0F0F" size={14} strokeWidth={2.5} />
          </div>
        ) : isActive ? (
          <div className="w-[24px] h-[24px] rounded-full border-2 border-accent flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          </div>
        ) : (
          <div className="w-[24px] h-[24px] rounded-full border border-[#333]" />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 pb-8">
        <h3
          className={`text-[14px] font-medium ${
            isCompleted
              ? "text-white"
              : isActive
                ? "text-accent"
                : "text-[#555]"
          }`}
        >
          {step.title}
        </h3>

        {step.status === "pending" && step.subtitle && (
          <p className="text-[11px] text-[#444] mt-0.5">{step.subtitle}</p>
        )}

        {(isCompleted || isActive) && <TerminalLog logs={step.logs} />}
      </div>
    </div>
  );
};
