import Link from "next/link";
import { LupaiLogo } from "@/components/ui/LupaiLogo";

/** Página 404 global — rota não encontrada */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <LupaiLogo size={40} variant="green" />
        </div>
        <h1 className="font-serif text-[72px] text-white leading-none mb-4">
          404
        </h1>
        <h2 className="font-serif text-[22px] text-white mb-2">
          Página não encontrada
        </h2>
        <p className="text-[14px] text-[#999] mb-8 max-w-md mx-auto">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#C8FF3C] text-[#0F0F0F] rounded-full px-6 py-3 font-medium text-[14px] hover:brightness-110 transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
