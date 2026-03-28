import { LupaiLogo } from "@/components/ui/LupaiLogo";

/** Rodapé global */
export const Footer = () => {
  return (
    <footer className="bg-[#0A0A0A] px-6 py-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LupaiLogo size={18} variant="green" />
          <span className="text-xs font-medium text-[#555]">LupAI</span>
        </div>
        <p className="text-[11px] text-[#444]">
          Feito por Gabriel Alves · Desafio Human Academy 2026
        </p>
      </div>
    </footer>
  );
};
