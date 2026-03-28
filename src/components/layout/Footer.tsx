import { LupaiLogo } from "@/components/ui/LupaiLogo";

/** Rodapé global */
export const Footer = () => {
  return (
    <footer className="bg-[#0A0A0A] px-6 py-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 items-center md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <LupaiLogo size={18} variant="green" />
          <span className="text-xs font-medium text-[#555]">LupAI</span>
        </div>
        <p className="text-[11px] text-[#444]">
          Feito por{" "}
          <a
            href="https://linkedin.com/in/biel-als/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#666] hover:text-white transition-colors"
          >
            Gabriel Alves
          </a>{" "}
          · Desafio Human Academy 2026
        </p>
        <a
          href="mailto:bielalvestrafego@gmail.com"
          className="text-sm text-[#999] hover:text-white transition-colors"
        >
          Contato
        </a>
      </div>
    </footer>
  );
};
