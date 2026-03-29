import { LupaiLogo } from "@/components/ui/LupaiLogo";

/** Loading state global */
export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4 animate-pulse">
          <LupaiLogo size={40} variant="green" />
        </div>
        <p className="text-[#999] text-sm">Carregando...</p>
      </div>
    </div>
  );
}
