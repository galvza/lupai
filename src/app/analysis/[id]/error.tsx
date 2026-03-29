"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

/** Error boundary para a página de análise */
export default function AnalysisError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <AlertCircle
          color="#FF6B6B"
          size={32}
          strokeWidth={1.5}
          className="mx-auto mb-4"
        />
        <h2 className="font-serif text-[22px] text-white mb-2">
          Algo deu errado
        </h2>
        <p className="text-[13px] text-[#666] mb-6">
          Não foi possível carregar os dados da análise. Tente novamente.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-[#C8FF3C] text-[#0F0F0F] text-[13px] font-semibold px-5 py-2 rounded-lg hover:brightness-110 transition-all"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="text-[13px] text-[#888] hover:text-white transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
