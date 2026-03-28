"use client";

const PILLS_LEFT = [
  "Academia de crossfit",
  "Pizzaria delivery",
  "Clínica odontológica",
  "Loja de roupas femininas",
  "Escritório de advocacia",
];

const PILLS_RIGHT = [
  "Salão de beleza",
  "E-commerce de suplementos",
  "Imobiliária em SP",
  "Clínica de estética",
  "Pet shop premium",
];

const OPACITIES = [0.4, 0.55, 0.7, 0.5, 0.6];
const DELAYS = ["0s", "0.5s", "1s", "1.5s", "2s"];

/** Decorative floating pills with niche examples flanking the hero */
export const FloatingPills = () => {
  return (
    <>
      {/* Desktop — left column */}
      <div className="hidden md:flex absolute left-4 lg:left-8 top-0 bottom-0 w-[180px] flex-col items-start gap-6 justify-center z-0 pointer-events-none">
        {PILLS_LEFT.map((text, i) => (
          <span
            key={text}
            className="rounded-full px-4 py-2 border border-[#333] text-[#666] text-sm bg-[#1A1A1A]/50 backdrop-blur-sm whitespace-nowrap animate-float"
            style={{
              opacity: OPACITIES[i],
              animationDelay: DELAYS[i],
            }}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Desktop — right column */}
      <div className="hidden md:flex absolute right-4 lg:right-8 top-0 bottom-0 w-[180px] flex-col items-end gap-6 justify-center z-0 pointer-events-none">
        {PILLS_RIGHT.map((text, i) => (
          <span
            key={text}
            className="rounded-full px-4 py-2 border border-[#333] text-[#666] text-sm bg-[#1A1A1A]/50 backdrop-blur-sm whitespace-nowrap animate-float"
            style={{
              opacity: OPACITIES[i],
              animationDelay: DELAYS[i],
            }}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Mobile — compact horizontal row */}
      <div className="md:hidden flex flex-wrap justify-center gap-2 mb-6">
        {[...PILLS_LEFT.slice(0, 3), ...PILLS_RIGHT.slice(0, 3)].map(
          (text) => (
            <span
              key={text}
              className="rounded-full px-3 py-1.5 border border-[#333] text-[#666] text-xs bg-[#1A1A1A]/50 whitespace-nowrap opacity-40"
            >
              {text}
            </span>
          )
        )}
      </div>
    </>
  );
};
