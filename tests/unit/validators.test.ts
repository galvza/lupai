import { describe, it, expect } from 'vitest';
import { analysisInputSchema, nicheInterpretedSchema } from '@/utils/validators';

describe('analysisInputSchema', () => {
  it('aceita input valido com modo quick', () => {
    const result = analysisInputSchema.parse({
      nicheInput: 'clinicas odontologicas em SP',
      mode: 'quick',
    });
    expect(result.nicheInput).toBe('clinicas odontologicas em SP');
    expect(result.mode).toBe('quick');
  });

  it('aceita input valido com modo complete e URL', () => {
    const result = analysisInputSchema.parse({
      nicheInput: 'academias de crossfit',
      mode: 'complete',
      userBusinessUrl: 'https://minhacademia.com.br',
    });
    expect(result.mode).toBe('complete');
    expect(result.userBusinessUrl).toBe('https://minhacademia.com.br');
  });

  it('usa modo quick como padrao', () => {
    const result = analysisInputSchema.parse({
      nicheInput: 'restaurantes japoneses',
    });
    expect(result.mode).toBe('quick');
  });

  it('rejeita nicheInput muito curto (menos de 3 caracteres)', () => {
    expect(() => analysisInputSchema.parse({ nicheInput: 'ab' })).toThrow();
  });

  it('rejeita nicheInput vazio', () => {
    expect(() => analysisInputSchema.parse({ nicheInput: '' })).toThrow();
  });

  it('rejeita nicheInput muito longo (mais de 500 caracteres)', () => {
    const longInput = 'a'.repeat(501);
    expect(() => analysisInputSchema.parse({ nicheInput: longInput })).toThrow();
  });

  it('rejeita URL invalida', () => {
    expect(() =>
      analysisInputSchema.parse({
        nicheInput: 'teste',
        userBusinessUrl: 'nao-e-uma-url',
      })
    ).toThrow();
  });

  it('aceita userBusinessUrl null', () => {
    const result = analysisInputSchema.parse({
      nicheInput: 'teste valido',
      userBusinessUrl: null,
    });
    expect(result.userBusinessUrl).toBeNull();
  });
});

describe('nicheInterpretedSchema', () => {
  it('aceita interpretacao valida', () => {
    const result = nicheInterpretedSchema.parse({
      niche: 'odontologia',
      segment: 'clinicas',
      region: 'Sao Paulo, SP',
    });
    expect(result.niche).toBe('odontologia');
    expect(result.segment).toBe('clinicas');
    expect(result.region).toBe('Sao Paulo, SP');
  });

  it('rejeita niche vazio', () => {
    expect(() =>
      nicheInterpretedSchema.parse({
        niche: '',
        segment: 'clinicas',
        region: 'SP',
      })
    ).toThrow();
  });

  it('rejeita objeto incompleto (sem region)', () => {
    expect(() =>
      nicheInterpretedSchema.parse({
        niche: 'odontologia',
        segment: 'clinicas',
      })
    ).toThrow();
  });
});
