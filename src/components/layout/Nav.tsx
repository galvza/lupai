"use client";

import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "#hero" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Pra quem é", href: "#pra-quem" },
];

/** Floating pill-style navbar with active section detection */
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
    <nav
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-[#1A1A1A]/90 backdrop-blur-md rounded-full px-2 py-2 transition-shadow duration-300 ${
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
            className={`hidden md:block text-[13px] px-4 py-2 rounded-full transition-all ${
              isActive
                ? "bg-[#333] text-white"
                : "text-[#999] hover:bg-[#222] hover:text-white"
            }`}
          >
            {label}
          </a>
        );
      })}

      {/* Mobile: show only Home */}
      <a
        href="#hero"
        className="md:hidden text-xs px-3 py-1.5 rounded-full text-[#999] hover:bg-[#222] hover:text-white transition-all"
      >
        Home
      </a>

      <a
        href="#cta"
        className="bg-accent text-dark-bg text-[13px] md:text-[13px] text-xs font-semibold px-4 md:px-5 py-1.5 md:py-2 rounded-full hover:brightness-110 transition-all"
      >
        Começar
      </a>
    </nav>
  );
};
