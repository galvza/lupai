import { describe, it, expect } from 'vitest';
import { classifyInput } from '@/lib/ai/classify';
import type { InputClassification } from '@/lib/ai/classify';

describe('classifyInput', () => {
  describe('NONSENSE', () => {
    it('retorna NONSENSE para string vazia', () => {
      expect(classifyInput('')).toBe('NONSENSE');
    });

    it('retorna NONSENSE para input com menos de 3 letras', () => {
      expect(classifyInput('asd')).toBe('NONSENSE');
    });

    it('retorna NONSENSE para input sem letras', () => {
      expect(classifyInput('12345')).toBe('NONSENSE');
    });

    it('retorna NONSENSE para espacos em branco', () => {
      expect(classifyInput('   ')).toBe('NONSENSE');
    });
  });

  describe('MINIMAL', () => {
    it('retorna MINIMAL para 1 palavra', () => {
      expect(classifyInput('suplementos')).toBe('MINIMAL');
    });

    it('retorna MINIMAL para 2 palavras', () => {
      expect(classifyInput('dentista SP')).toBe('MINIMAL');
    });
  });

  describe('MEDIUM', () => {
    it('retorna MEDIUM para input com 6 palavras', () => {
      expect(classifyInput('loja de suplementos esportivos em Campinas')).toBe('MEDIUM');
    });

    it('retorna MEDIUM para input com 3 palavras', () => {
      expect(classifyInput('e-commerce de roupas')).toBe('MEDIUM');
    });

    it('retorna MEDIUM para input com palavras entre 3 e 29', () => {
      expect(classifyInput('vendo produtos naturais para saude e bem estar na regiao metropolitana')).toBe('MEDIUM');
    });
  });

  describe('URL', () => {
    it('retorna URL para dominio com www', () => {
      expect(classifyInput('www.lojadowhey.com.br')).toBe('URL');
    });

    it('retorna URL para URL com https', () => {
      expect(classifyInput('https://instagram.com/loja')).toBe('URL');
    });

    it('retorna URL para dominio simples com .com.br', () => {
      expect(classifyInput('minhalojaonline.com.br')).toBe('URL');
    });

    it('NAO retorna URL para URL embutida em frase', () => {
      expect(classifyInput('e-commerce.com de roupas')).not.toBe('URL');
    });
  });

  describe('EXCESSIVE', () => {
    it('retorna EXCESSIVE para input com 30+ palavras', () => {
      const longParagraph = Array(35).fill('palavra').join(' ');
      expect(classifyInput(longParagraph)).toBe('EXCESSIVE');
    });

    it('retorna EXCESSIVE para paragrafo longo real', () => {
      const longInput = 'Eu tenho uma loja de suplementos esportivos em Campinas que vende whey protein e creatina para atletas e praticantes de musculacao que frequentam academias na regiao metropolitana de Campinas e tambem faco entregas para toda regiao de Sao Paulo capital e interior';
      expect(classifyInput(longInput)).toBe('EXCESSIVE');
    });
  });

  describe('edge cases', () => {
    it('classifica corretamente input com acentos', () => {
      expect(classifyInput('padaria artesanal em Sao Paulo')).toBe('MEDIUM');
    });

    it('classifica corretamente input com URL http', () => {
      expect(classifyInput('http://meusite.com')).toBe('URL');
    });
  });
});
