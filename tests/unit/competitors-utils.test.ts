import { describe, it, expect } from 'vitest';
import {
  extractBaseDomain,
  isBlockedDomain,
  filterBlockedDomains,
  deduplicateCandidates,
  BLOCKED_DOMAINS,
} from '@/utils/competitors';
import { createRawCandidate } from '../fixtures/factories';

describe('extractBaseDomain', () => {
  it('extrai dominio de URL completa com https', () => {
    expect(extractBaseDomain('https://clinicasorriso.com.br/contato')).toBe('clinicasorriso.com.br');
  });

  it('remove www. do dominio', () => {
    expect(extractBaseDomain('https://www.odontovida.com.br')).toBe('odontovida.com.br');
  });

  it('retorna dominio em minusculo', () => {
    expect(extractBaseDomain('https://WWW.ClinicaSorriso.COM.BR')).toBe('clinicasorriso.com.br');
  });

  it('retorna string vazia para URL invalida', () => {
    expect(extractBaseDomain('nao-e-url')).toBe('');
  });

  it('retorna string vazia para string vazia', () => {
    expect(extractBaseDomain('')).toBe('');
  });
});

describe('isBlockedDomain', () => {
  it('bloqueia Amazon', () => {
    expect(isBlockedDomain('https://amazon.com.br/produto')).toBe(true);
  });

  it('bloqueia Mercado Livre', () => {
    expect(isBlockedDomain('https://mercadolivre.com.br/item')).toBe(true);
  });

  it('bloqueia Shopee', () => {
    expect(isBlockedDomain('https://shopee.com.br/loja')).toBe(true);
  });

  it('bloqueia Wikipedia', () => {
    expect(isBlockedDomain('https://pt.wikipedia.org/wiki/Odontologia')).toBe(true);
  });

  it('bloqueia YouTube', () => {
    expect(isBlockedDomain('https://www.youtube.com/watch')).toBe(true);
  });

  it('bloqueia Reclame Aqui', () => {
    expect(isBlockedDomain('https://reclameaqui.com.br/empresa')).toBe(true);
  });

  it('bloqueia Instagram', () => {
    expect(isBlockedDomain('https://instagram.com/perfil')).toBe(true);
  });

  it('bloqueia Google', () => {
    expect(isBlockedDomain('https://google.com.br/search')).toBe(true);
  });

  it('permite URL de negocio legitimo', () => {
    expect(isBlockedDomain('https://clinicasorriso.com.br')).toBe(false);
  });

  it('permite URL de negocio com www', () => {
    expect(isBlockedDomain('https://www.dentalprime.com.br')).toBe(false);
  });

  it('bloqueia URL invalida (retorna true)', () => {
    expect(isBlockedDomain('invalido')).toBe(true);
  });

  it('bloqueia URL vazia (retorna true)', () => {
    expect(isBlockedDomain('')).toBe(true);
  });
});

describe('filterBlockedDomains', () => {
  it('remove candidatos de dominios bloqueados', () => {
    const candidates = [
      createRawCandidate({ name: 'Clinica Sorriso', url: 'https://clinicasorriso.com.br' }),
      createRawCandidate({ name: 'Amazon', url: 'https://amazon.com.br/odonto' }),
      createRawCandidate({ name: 'DentalPrime', url: 'https://dentalprime.com.br' }),
      createRawCandidate({ name: 'Mercado Livre', url: 'https://mercadolivre.com.br/dental' }),
    ];

    const filtered = filterBlockedDomains(candidates);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((c) => c.name)).toEqual(['Clinica Sorriso', 'DentalPrime']);
  });

  it('retorna array vazio se todos estao bloqueados', () => {
    const candidates = [
      createRawCandidate({ name: 'Amazon', url: 'https://amazon.com.br' }),
      createRawCandidate({ name: 'YouTube', url: 'https://youtube.com' }),
    ];

    expect(filterBlockedDomains(candidates)).toHaveLength(0);
  });

  it('retorna todos se nenhum esta bloqueado', () => {
    const candidates = [
      createRawCandidate({ name: 'A', url: 'https://clinicaa.com.br' }),
      createRawCandidate({ name: 'B', url: 'https://clinicab.com.br' }),
    ];

    expect(filterBlockedDomains(candidates)).toHaveLength(2);
  });
});

describe('deduplicateCandidates', () => {
  it('remove duplicatas pelo dominio base', () => {
    const candidates = [
      createRawCandidate({ url: 'https://clinicasorriso.com.br', description: 'curta' }),
      createRawCandidate({ url: 'https://clinicasorriso.com.br/contato', description: 'descricao mais longa e detalhada' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('descricao mais longa e detalhada');
  });

  it('trata www. e sem www. como mesmo dominio', () => {
    const candidates = [
      createRawCandidate({ url: 'https://www.odontovida.com.br', description: 'com www' }),
      createRawCandidate({ url: 'https://odontovida.com.br', description: 'sem www mas com descricao muito mais longa' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('sem www mas com descricao muito mais longa');
  });

  it('mantem candidatos de dominios diferentes', () => {
    const candidates = [
      createRawCandidate({ url: 'https://clinicaa.com.br' }),
      createRawCandidate({ url: 'https://clinicab.com.br' }),
      createRawCandidate({ url: 'https://clinicac.com.br' }),
    ];

    expect(deduplicateCandidates(candidates)).toHaveLength(3);
  });

  it('ignora candidatos com URL invalida', () => {
    const candidates = [
      createRawCandidate({ url: 'invalido' }),
      createRawCandidate({ url: 'https://clinicasorriso.com.br' }),
    ];

    const result = deduplicateCandidates(candidates);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://clinicasorriso.com.br');
  });
});

describe('BLOCKED_DOMAINS', () => {
  it('contem todos os marketplaces esperados', () => {
    expect(BLOCKED_DOMAINS).toContain('amazon.com.br');
    expect(BLOCKED_DOMAINS).toContain('mercadolivre.com.br');
    expect(BLOCKED_DOMAINS).toContain('shopee.com.br');
    expect(BLOCKED_DOMAINS).toContain('magazineluiza.com.br');
    expect(BLOCKED_DOMAINS).toContain('americanas.com.br');
    expect(BLOCKED_DOMAINS).toContain('aliexpress.com');
    expect(BLOCKED_DOMAINS).toContain('casasbahia.com.br');
  });

  it('contem portais genericos e redes sociais', () => {
    expect(BLOCKED_DOMAINS).toContain('wikipedia.org');
    expect(BLOCKED_DOMAINS).toContain('youtube.com');
    expect(BLOCKED_DOMAINS).toContain('reclameaqui.com.br');
    expect(BLOCKED_DOMAINS).toContain('facebook.com');
    expect(BLOCKED_DOMAINS).toContain('instagram.com');
    expect(BLOCKED_DOMAINS).toContain('tiktok.com');
    expect(BLOCKED_DOMAINS).toContain('google.com');
    expect(BLOCKED_DOMAINS).toContain('google.com.br');
  });
});
