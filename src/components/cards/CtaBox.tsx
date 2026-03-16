/**
 * Call-to-action box convidando o leitor a explorar o código-fonte.
 *
 * Bloco editorial com borda, text-align center e link outline
 * pro repositório GitHub. Hover com fundo sutil.
 */

/** CTA box com convite pra explorar o código no GitHub. */
const CtaBox = () => {
  return (
    <div
      className="my-10"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.7,
          color: "var(--text-secondary)",
          marginBottom: "16px",
        }}
      >
        Este projeto é open source. Todo o código do pipeline de dados e do
        dashboard está disponível no GitHub.
      </p>
      <a
        href="https://github.com/galvza/calmai"
        target="_blank"
        rel="noopener noreferrer"
        className="cta-link"
        style={{
          display: "inline-block",
          padding: "10px 24px",
          borderRadius: "8px",
          border: "1px solid var(--text-primary)",
          color: "var(--text-primary)",
          fontSize: "14px",
          fontWeight: 500,
          textDecoration: "none",
          transition: "background 0.15s ease",
        }}
      >
        Ver código-fonte e metodologia &#x2197;
      </a>
    </div>
  );
};

export default CtaBox;
