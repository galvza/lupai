import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeGoogleSearch } from '@/lib/apify/google-search';
import googleSearchFixture from '../fixtures/google-search.json';

const mockListItems = vi.fn();
const mockDataset = vi.fn(() => ({ listItems: mockListItems }));
const mockCall = vi.fn();
const mockActor = vi.fn(() => ({ call: mockCall }));

vi.mock('apify-client', () => {
  return {
    ApifyClient: class MockApifyClient {
      actor = mockActor;
      dataset = mockDataset;
    },
  };
});

describe('scrapeGoogleSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna resultados organicos filtrados do fixture', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-001' });
    mockListItems.mockResolvedValue({ items: googleSearchFixture });

    const results = await scrapeGoogleSearch(['clinicas odontologicas SP']);

    expect(results).toHaveLength(6);
    expect(results[0]).toEqual({
      title: 'Clinica Sorriso SP - Odontologia Especializada',
      url: 'https://clinicasorriso.com.br',
      description: 'Clinica odontologica com tratamentos especializados em Sao Paulo.',
    });
  });

  it('filtra entradas sem url ou title', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-002' });
    mockListItems.mockResolvedValue({
      items: [{
        organicResults: [
          { title: 'Valido', url: 'https://valido.com.br', description: 'ok' },
          { title: '', url: 'https://semtitulo.com.br', description: 'sem titulo' },
          { title: 'Sem URL', url: '', description: 'sem url' },
          { title: null, url: 'https://nulo.com.br', description: 'nulo' },
          { title: 'Sem URL nulo', url: null, description: 'nulo' },
        ],
      }],
    });

    const results = await scrapeGoogleSearch(['teste']);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valido');
  });

  it('usa o actor ID correto', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-003' });
    mockListItems.mockResolvedValue({ items: [] });

    await scrapeGoogleSearch(['teste']);

    expect(mockActor).toHaveBeenCalledWith('apify/google-search-scraper');
  });

  it('passa input correto para o actor', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-004' });
    mockListItems.mockResolvedValue({ items: [] });

    await scrapeGoogleSearch(['query1', 'query2'], 'US');

    expect(mockCall).toHaveBeenCalledWith({
      queries: 'query1\nquery2',
      countryCode: 'us',
      languageCode: 'pt-BR',
      maxPagesPerQuery: 1,
      resultsPerPage: 10,
    });
  });

  it('usa countryCode padrao BR', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-005' });
    mockListItems.mockResolvedValue({ items: [] });

    await scrapeGoogleSearch(['query']);

    expect(mockCall).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'br' })
    );
  });

  it('lanca erro em PT-BR quando actor falha', async () => {
    mockCall.mockRejectedValue(new Error('Actor timeout'));

    await expect(
      scrapeGoogleSearch(['clinicas SP'])
    ).rejects.toThrow('Erro ao buscar resultados do Google para "clinicas SP": Actor timeout');
  });

  it('retorna array vazio quando nao ha resultados organicos', async () => {
    mockCall.mockResolvedValue({ defaultDatasetId: 'ds-006' });
    mockListItems.mockResolvedValue({ items: [{ organicResults: [] }] });

    const results = await scrapeGoogleSearch(['query vazia']);
    expect(results).toHaveLength(0);
  });
});
