/**
 * Rodapé do dashboard.
 *
 * Exibe fontes de dados, link pro repositório GitHub
 * e créditos do projeto.
 */

/** Rodapé com créditos, fontes e link do repositório. */
const Footer = () => {
  return (
    <footer
      className="py-8 mt-12 font-ui"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div
        className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4"
        style={{ fontSize: "var(--fs-body-sm)", color: "var(--text-secondary)" }}
      >
        <span>Dados: BCB (API SGS) &middot; DIEESE &middot; ANP &middot; IBGE (SIDRA) &middot; FipeZAP</span>
        <a
          href="https://github.com/galvza/calmai"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: "var(--text-primary)" }}
        >
          Ver código no GitHub &#x2197;
        </a>
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "var(--text-tertiary)",
          lineHeight: 1.5,
        }}
      >
        Projeto de portfólio. Dados públicos. Sem opinião partidária. Os números
        estão aí — você decide o que eles significam.
      </p>
    </footer>
  );
};

export default Footer;
