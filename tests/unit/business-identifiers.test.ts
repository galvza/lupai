import { describe, it, expect } from 'vitest';
import { extractBusinessIdentifiers } from '@/utils/businessIdentifiers';

describe('extractBusinessIdentifiers', () => {
  it('extrai CNPJ com mascara', () => {
    const result = extractBusinessIdentifiers('Empresa CNPJ: 12.345.678/0001-90 localizada em SP');
    expect(result.cnpj).toBe('12.345.678/0001-90');
  });

  it('extrai CNPJ sem mascara', () => {
    const result = extractBusinessIdentifiers('CNPJ 12345678000190 registrado');
    expect(result.cnpj).toBe('12345678000190');
  });

  it('extrai dominio de email', () => {
    const result = extractBusinessIdentifiers('Entre em contato: contato@acme.com.br para mais info');
    expect(result.emailDomain).toBe('acme.com.br');
  });

  it('retorna nulls quando nao encontra identificadores', () => {
    const result = extractBusinessIdentifiers('Texto simples sem nenhum identificador');
    expect(result.cnpj).toBeNull();
    expect(result.emailDomain).toBeNull();
  });

  it('extrai ambos CNPJ e email do mesmo texto', () => {
    const result = extractBusinessIdentifiers(
      'Empresa 12.345.678/0001-90 email: contato@empresa.com.br'
    );
    expect(result.cnpj).toBe('12.345.678/0001-90');
    expect(result.emailDomain).toBe('empresa.com.br');
  });

  it('retorna string vazia produz nulls', () => {
    const result = extractBusinessIdentifiers('');
    expect(result.cnpj).toBeNull();
    expect(result.emailDomain).toBeNull();
  });

  it('pega primeiro CNPJ quando ha multiplos', () => {
    const result = extractBusinessIdentifiers(
      'CNPJ 12.345.678/0001-90 e tambem 98.765.432/0001-10'
    );
    expect(result.cnpj).toBe('12.345.678/0001-90');
  });

  it('pega primeiro dominio de email quando ha multiplos', () => {
    const result = extractBusinessIdentifiers(
      'contato@empresa.com.br e suporte@outra.com'
    );
    expect(result.emailDomain).toBe('empresa.com.br');
  });
});
