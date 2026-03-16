/**
 * Wrapper de seção do dashboard.
 *
 * Renderiza um bloco com separador, número de capítulo opcional,
 * título e conteúdo. Usado pra estruturar o layout narrativo.
 */

type SectionProps = {
  /** Número do capítulo (opcional). */
  chapterNumber?: number;
  /** Título da seção. */
  title: string;
  /** ID para âncora (opcional). */
  id?: string;
  /** Conteúdo da seção. */
  children: React.ReactNode;
};

/** Seção narrativa com separador, título e conteúdo. */
const Section = ({ chapterNumber, title, id, children }: SectionProps) => {
  return (
    <section
      id={id}
      className="py-8"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {chapterNumber != null && (
        <p
          className="mb-2 font-ui"
          style={{
            fontSize: "var(--fs-label)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Capítulo {chapterNumber}
        </p>
      )}

      <h2 className="mb-6">
        {title}
      </h2>

      {children}
    </section>
  );
};

export default Section;
