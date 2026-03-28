/** Identificadores de negocio extraidos do site */
export interface BusinessIdentifiers {
  cnpj: string | null;
  emailDomain: string | null;
}

/** Regex para CNPJ com ou sem mascara */
const CNPJ_REGEX = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g;

/** Regex para email (captura dominio no grupo 1) */
const EMAIL_REGEX = /[\w.-]+@([\w-]+\.[\w.-]+)/gi;

/**
 * Extrai identificadores de negocio (CNPJ e dominio de email) de um texto.
 * Retorna o primeiro CNPJ e o primeiro dominio de email encontrados.
 * @param text - Texto das paginas do site
 * @returns Objeto com cnpj e emailDomain (ou null se nao encontrado)
 */
export const extractBusinessIdentifiers = (text: string): BusinessIdentifiers => {
  // Reset lastIndex antes de cada uso (regex global)
  CNPJ_REGEX.lastIndex = 0;
  EMAIL_REGEX.lastIndex = 0;

  const cnpjMatch = CNPJ_REGEX.exec(text);
  const emailMatch = EMAIL_REGEX.exec(text);

  return {
    cnpj: cnpjMatch?.[0] ?? null,
    emailDomain: emailMatch?.[1] ?? null,
  };
};
