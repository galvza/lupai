const ITEMS = [
  "DESCOBRE CONCORRENTES",
  "ANALISA SEO",
  "MONITORA ANÚNCIOS",
  "TRANSCREVE VIRAIS",
  "MODELA ROTEIROS",
  "IDENTIFICA GAPS",
  "ANALISA REDES SOCIAIS",
  "GERA RECOMENDAÇÕES",
];

const MarqueeRow = ({ reverse = false }: { reverse?: boolean }) => {
  const content = ITEMS.map((item, i) => (
    <span key={i} className="shrink-0 flex items-center gap-4">
      <span>{item}</span>
      <span className="text-accent">·</span>
    </span>
  ));

  return (
    <div className="overflow-hidden">
      <div
        className={`flex gap-4 whitespace-nowrap ${
          reverse ? "marquee-track-reverse" : "marquee-track"
        }`}
        style={{ width: "max-content" }}
      >
        {content}
        {content}
      </div>
    </div>
  );
};

/** Marquee com duas linhas scrollando em direções opostas */
export const Marquee = () => {
  return (
    <div className="marquee-container bg-light-bg py-10 space-y-4 select-none" aria-hidden="true">
      <div
        className="text-2xl md:text-3xl lg:text-4xl uppercase tracking-wide text-[#222222]"
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
      >
        <MarqueeRow />
      </div>
      <div
        className="text-2xl md:text-3xl lg:text-4xl uppercase tracking-wide text-[#222222]"
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}
      >
        <MarqueeRow reverse />
      </div>
    </div>
  );
};
