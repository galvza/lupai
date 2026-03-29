import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scoreCompetitorsWithAI } from '@/lib/ai/score-competitors';
import geminiScoreFixture from '../fixtures/gemini-score-competitors.json';
import { createRawCandidate } from '../fixtures/factories';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

const defaultCandidates = [
  createRawCandidate({ name: 'Clinica Sorriso SP', url: 'https://clinicasorriso.com.br' }),
  createRawCandidate({ name: 'OdontoVida', url: 'https://odontovida.com.br' }),
  createRawCandidate({ name: 'DentalPrime', url: 'https://dentalprime.com.br' }),
];

describe('scoreCompetitorsWithAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna concorrentes com score >= 70', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(geminiScoreFixture),
    });

    const results = await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(results).toHaveLength(3);
    results.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(70);
    });
  });

  it('ordena por score descendente', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(geminiScoreFixture),
    });

    const results = await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('limita a 4 resultados no maximo', async () => {
    const fiveCompetitors = {
      competitors: [
        { ...geminiScoreFixture.competitors[0], name: 'A', score: 95 },
        { ...geminiScoreFixture.competitors[0], name: 'B', score: 90 },
        { ...geminiScoreFixture.competitors[0], name: 'C', score: 85 },
        { ...geminiScoreFixture.competitors[0], name: 'D', score: 80 },
        { ...geminiScoreFixture.competitors[0], name: 'E', score: 75 },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(fiveCompetitors),
    });

    const results = await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(results).toHaveLength(4);
  });

  it('filtra concorrentes abaixo de 70', async () => {
    const mixedScores = {
      competitors: [
        { ...geminiScoreFixture.competitors[0], name: 'Alto', score: 85 },
        { ...geminiScoreFixture.competitors[0], name: 'Baixo', score: 50 },
        { ...geminiScoreFixture.competitors[0], name: 'Medio', score: 69 },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(mixedScores),
    });

    const results = await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alto');
  });

  it('usa modelo gemini-2.0-flash', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(geminiScoreFixture),
    });

    await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash' })
    );
  });

  it('usa structured JSON output', async () => {
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(geminiScoreFixture),
    });

    await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          responseMimeType: 'application/json',
          responseJsonSchema: expect.any(Object),
        }),
      })
    );
  });

  it('lanca erro em PT-BR quando Gemini falha', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API rate limit'));

    await expect(
      scoreCompetitorsWithAI(
        defaultCandidates,
        'odontologia',
        'clinicas odontologicas',
        'Sao Paulo, SP'
      )
    ).rejects.toThrow('Erro ao pontuar concorrentes com IA: API rate limit');
  });

  it('lanca erro para resposta vazia do Gemini', async () => {
    mockGenerateContent.mockResolvedValue({ text: null });

    await expect(
      scoreCompetitorsWithAI(
        defaultCandidates,
        'odontologia',
        'clinicas odontologicas',
        'Sao Paulo, SP'
      )
    ).rejects.toThrow('Erro ao pontuar concorrentes com IA');
  });

  it('retorna array vazio quando nenhum candidato atinge threshold', async () => {
    const lowScores = {
      competitors: [
        { ...geminiScoreFixture.competitors[0], score: 30 },
        { ...geminiScoreFixture.competitors[1], score: 45 },
      ],
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(lowScores),
    });

    const results = await scoreCompetitorsWithAI(
      defaultCandidates,
      'odontologia',
      'clinicas odontologicas',
      'Sao Paulo, SP'
    );

    expect(results).toHaveLength(0);
  });
});
