/**
 * Classificacao do input do usuario antes de enviar ao Gemini.
 * Economiza tokens de API ao filtrar inputs invalidos ou insuficientes.
 */

/** Categorias de classificacao do input */
export type InputClassification = 'MINIMAL' | 'MEDIUM' | 'URL' | 'EXCESSIVE' | 'NONSENSE';

/**
 * Classifica o input do usuario antes de enviar ao Gemini.
 * Economiza tokens de API ao filtrar inputs invalidos ou insuficientes.
 * @param input - Texto livre do usuario
 * @returns Classificacao do input em uma das 5 categorias
 */
export const classifyInput = (input: string): InputClassification => {
  const trimmed = input.trim();

  // NONSENSE: vazio ou menos de 3 caracteres alfabeticos
  const letterCount = (trimmed.match(/[a-zA-Z\u00C0-\u00FF]/g) ?? []).length;
  if (trimmed.length === 0 || letterCount <= 3) {
    return 'NONSENSE';
  }

  // URL: string inteira eh uma URL (anchors garantem que nao eh URL embutida em frase)
  const urlPattern = /^(https?:\/\/|www\.)[^\s]+$|^[a-zA-Z0-9][\w-]*\.(com|com\.br|net|org|io|app|store|shop)(\.br)?(\/\S*)?$/i;
  if (urlPattern.test(trimmed)) {
    return 'URL';
  }

  // Contagem de palavras
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount <= 2) {
    return 'MINIMAL';
  }

  if (wordCount >= 30) {
    return 'EXCESSIVE';
  }

  return 'MEDIUM';
};
