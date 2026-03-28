"use client";

import { useState, useEffect } from "react";
import { LupaiLogo } from "@/components/ui/LupaiLogo";

const NAV_ITEMS = [
  { label: "Home", href: "#hero" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Pra quem é", href: "#pra-quem" },
];

const scrollToInput = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("hero-input")?.scrollIntoView({ behavior: "smooth" });
};

/** Floating pill navbar (desktop) + fixed top bar (mobile) */
export const Nav = () => {
  const [active, setActive] = useState("hero");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sections = ["hero", "como-funciona", "pra-quem", "cta"];
    const observers: IntersectionObserver[] = [];

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-40% 0px -40% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    });

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      {/* Desktop — floating pill */}
      <nav
        className={`hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 items-center gap-1 bg-[#1A1A1A]/90 backdrop-blur-md rounded-full px-2 py-2 transition-shadow duration-300 ${
          scrolled ? "shadow-lg shadow-black/20" : ""
        }`}
        style={{ border: "0.5px solid #333" }}
      >
        {NAV_ITEMS.map(({ label, href }) => {
          const sectionId = href.replace("#", "");
          const isActive = active === sectionId;

          return (
            <a
              key={href}
              href={href}
              className={`text-[13px] px-4 py-2 rounded-full transition-all ${
                isActive
                  ? "bg-[#333] text-white"
                  : "text-[#999] hover:bg-[#222] hover:text-white"
              }`}
            >
              {label}
            </a>
          );
        })}

        <button
          onClick={scrollToInput}
          className="bg-accent text-dark-bg text-[13px] font-semibold px-5 py-2 rounded-full hover:brightness-110 transition-all"
        >
          Começar
        </button>
      </nav>

      {/* Mobile — fixed top bar */}
      <nav className="md:hidden fixed top-0 left-0 w-full bg-[#0F0F0F] py-3 px-4 z-50 border-b border-[#222] flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <LupaiLogo size={24} variant="green" withText textSize="text-xs" />
        </a>
        <button
          onClick={scrollToInput}
          className="bg-accent text-dark-bg text-xs font-semibold px-4 py-1.5 rounded-full hover:brightness-110 transition-all"
        >
          Começar
        </button>
      </nav>
    </>
  );
};
