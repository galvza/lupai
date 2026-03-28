import { describe, it, expect } from 'vitest';
import { extractSocialLinksFromText } from '@/utils/socialLinks';

describe('extractSocialLinksFromText', () => {
  it('extrai Instagram de URL simples no texto', () => {
    const result = extractSocialLinksFromText('Visit us at instagram.com/acmebrand');
    expect(result.instagram).toBe('acmebrand');
    expect(result.tiktok).toBeNull();
  });

  it('extrai Instagram de link markdown', () => {
    const result = extractSocialLinksFromText('[Instagram](https://instagram.com/acmebrand)');
    expect(result.instagram).toBe('acmebrand');
  });

  it('filtra paths que nao sao perfis: explore', () => {
    const result = extractSocialLinksFromText('instagram.com/explore');
    expect(result.instagram).toBeNull();
  });

  it('filtra URLs de posts (instagram.com/p/abc123)', () => {
    const result = extractSocialLinksFromText('instagram.com/p/abc123');
    expect(result.instagram).toBeNull();
  });

  it('pega username mais frequente quando ha multiplas ocorrencias', () => {
    const text = `
      instagram.com/acmebrand
      instagram.com/acmebrand
      instagram.com/acmebrand
      instagram.com/other
    `;
    const result = extractSocialLinksFromText(text);
    expect(result.instagram).toBe('acmebrand');
  });

  it('detecta todas as 6 plataformas', () => {
    const text = `
      https://instagram.com/iguser
      https://tiktok.com/@tikuser
      https://facebook.com/fbpage
      https://youtube.com/@ytchannel
      https://linkedin.com/company/lncompany
      https://twitter.com/twuser
    `;
    const result = extractSocialLinksFromText(text);
    expect(result.instagram).toBe('iguser');
    expect(result.tiktok).toBe('tikuser');
    expect(result.facebook).toBe('fbpage');
    expect(result.youtube).toBe('ytchannel');
    expect(result.linkedin).toBe('lncompany');
    expect(result.twitter).toBe('twuser');
  });

  it('retorna todos null para string vazia', () => {
    const result = extractSocialLinksFromText('');
    expect(result.instagram).toBeNull();
    expect(result.tiktok).toBeNull();
    expect(result.facebook).toBeNull();
    expect(result.youtube).toBeNull();
    expect(result.linkedin).toBeNull();
    expect(result.twitter).toBeNull();
  });

  it('detecta x.com como twitter', () => {
    const result = extractSocialLinksFromText('https://x.com/elonmusk');
    expect(result.twitter).toBe('elonmusk');
  });

  it('detecta fb.com como facebook', () => {
    const result = extractSocialLinksFromText('https://fb.com/minhapagina');
    expect(result.facebook).toBe('minhapagina');
  });

  it('detecta youtube channel URL', () => {
    const result = extractSocialLinksFromText('https://youtube.com/channel/UCxyz123');
    expect(result.youtube).toBe('UCxyz123');
  });

  it('detecta linkedin perfil pessoal', () => {
    const result = extractSocialLinksFromText('https://linkedin.com/in/joaosilva');
    expect(result.linkedin).toBe('joaosilva');
  });

  it('filtra paths nao-perfil em multiplas plataformas', () => {
    const text = `
      instagram.com/login
      tiktok.com/signup
      facebook.com/sharer
      twitter.com/intent
      youtube.com/watch
      linkedin.com/help
    `;
    const result = extractSocialLinksFromText(text);
    expect(result.instagram).toBeNull();
    expect(result.tiktok).toBeNull();
    expect(result.facebook).toBeNull();
    expect(result.twitter).toBeNull();
    expect(result.youtube).toBeNull();
    expect(result.linkedin).toBeNull();
  });
});
