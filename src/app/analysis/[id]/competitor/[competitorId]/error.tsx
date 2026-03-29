"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LupaiLogo } from "@/components/ui/LupaiLogo";

/** Error boundary para deep dive do concorrente */
export default function CompetitorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-8">
          <LupaiLogo size={40} variant="green" />
        </div>
        <h2 className="font-serif text-[22px] text-white mb-2">
          Erro ao carregar concorrente
        </h2>
        <p className="text-[14px] text-[#999] mb-8">
          Não foi possível carregar os detalhes deste concorrente.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-[#C8FF3C] text-[#0F0F0F] rounded-full px-6 py-3 font-medium text-[14px] hover:brightness-110 transition-all"
          >
            Tentar novamente
          </button>
          <Link
            href=".."
            className="text-[14px] text-[#999] hover:text-white transition-colors"
          >
            Voltar à análise
          </Link>
        </div>
      </div>
    </div>
  );
}
