"use client";

import { Search } from "lucide-react";
import Link from "next/link";

/** Barra de navegação global */
export const Nav = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <Link href="/" className="flex items-center gap-2">
        <Search color="#C8FF3C" size={20} strokeWidth={1.5} />
        <span className="text-sm font-semibold tracking-wider text-white">
          LUPAI
        </span>
      </Link>

      <div className="flex items-center gap-6">
        <a
          href="#como-funciona"
          className="hidden sm:block text-sm text-[#888] hover:text-white transition-colors"
        >
          Como funciona
        </a>
        <a
          href="#pra-quem"
          className="hidden sm:block text-sm text-[#888] hover:text-white transition-colors"
        >
          Pra quem é
        </a>
        <a
          href="#cta"
          className="bg-accent text-dark-bg text-sm font-semibold px-4 py-2 rounded-lg hover:brightness-110 transition-all"
        >
          Começar
        </a>
      </div>
    </nav>
  );
};
