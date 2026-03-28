"use client";

import { useState, useEffect } from "react";
import { LupaiLogo } from "@/components/ui/LupaiLogo";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Home", href: "#hero" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Pra quem é", href: "#pra-quem" },
];

const DRAWER_LINKS = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "O que entrega", href: "#features" },
  { label: "Pra quem é", href: "#pra-quem" },
  { label: "Começar", href: "#hero-input" },
];

const scrollToInput = (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById("hero-input")?.scrollIntoView({ behavior: "smooth" });
};

/** Floating pill navbar (desktop) + fixed top bar (mobile) with drawer */
export const Nav = () => {
  const [active, setActive] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const handleDrawerLink = (href: string) => {
    setDrawerOpen(false);
    setTimeout(() => {
      document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={scrollToInput}
            className="bg-accent text-dark-bg text-xs font-semibold px-4 py-1.5 rounded-full hover:brightness-110 transition-all"
          >
            Começar
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col gap-1.5 p-1"
            aria-label="Abrir menu"
          >
            <span className="w-5 h-0.5 bg-accent block" />
            <span className="w-5 h-0.5 bg-accent block" />
            <span className="w-5 h-0.5 bg-accent block" />
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-[280px] bg-[#0F0F0F]/95 backdrop-blur-xl z-[60] md:hidden flex flex-col"
            >
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-accent p-2"
                  aria-label="Fechar menu"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col px-6">
                {DRAWER_LINKS.map(({ label, href }) => (
                  <button
                    key={href}
                    onClick={() => handleDrawerLink(href)}
                    className="text-white text-lg font-medium py-4 border-b border-[#222] text-left hover:text-accent transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
