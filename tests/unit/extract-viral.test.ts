import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mocks ---
const { mockMetadata, capturedRuns } = vi.hoisted(() => ({
  mockMetadata: { set: vi.fn() },
  capturedRuns: new Map<string, (payload: unknown) => Promise<unknown>>(),
}));

vi.mock('@trigger.dev/sdk', () => ({
  task: vi.fn((config: { id: string; run: (payload: unknown) => Promise<unknown> }) => {
    capturedRuns.set(config.id, config.run);
    return config;
  }),
  metadata: mockMetadata,
}));

vi.mock('@/lib/apify/tiktok-viral', () => ({
  searchViralTiktok: vi.fn(),
  calculateEngagementRate: vi.fn((e: { likes: number; comments: number; shares?: number | null; views?: number | null }) => {
    const interactions = e.likes + e.comments + (e.shares ?? 0);
    const views = Math.max(e.views ?? 1, 1);
    return interactions / views;
  }),
  filterAndSortCandidates: vi.fn((candidates: unknown[], maxResults: number = 5) => {
    return (candidates as Array<{ engagement: { views?: number | null; likes: number } }>)
      .sort((a, b) => ((b.engagement.views ?? 0) + b.engagement.likes) - ((a.engagement.views ?? 0) + a.engagement.likes))
      .slice(0, maxResults);
  }),
}));

vi.mock('@/lib/apify/instagram-viral', () => ({
  searchViralInstagram: vi.fn(),
}));

vi.mock('@/lib/ai/derive-hashtags', () => ({
  deriveViralHashtags: vi.fn(),
}));

vi.mock('@/lib/storage/bunny', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/lib/transcription/transcribe', () => ({
  transcribeVideo: vi.fn(),
}));

vi.mock('@/lib/ai/hbc-extraction', () => ({
  extractHookBodyCta: vi.fn(),
}));

vi.mock('@/lib/ai/viral-patterns', () => ({
  detectViralPatterns: vi.fn(),
}));

vi.mock('@/lib/supabase/queries', () => ({
  createViralContent: vi.fn(),
  updateViralContent: vi.fn(),
  updateAnalysisViralPatterns: vi.fn(),
}));

// Mock global fetch for video download
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { searchViralTiktok } from '@/lib/apify/tiktok-viral';
import { searchViralInstagram } from '@/lib/apify/instagram-viral';
import { deriveViralHashtags } from '@/lib/ai/derive-hashtags';
import { uploadFile } from '@/lib/storage/bunny';
import { transcribeVideo } from '@/lib/transcription/transcribe';
import { extractHookBodyCta } from '@/lib/ai/hbc-extraction';
import { detectViralPatterns } from '@/lib/ai/viral-patterns';
import {
  createViralContent,
  updateViralContent,
  updateAnalysisViralPatterns,
} from '@/lib/supabase/queries';
import type { ViralVideoCandidate, ViralContent, HookBodyCta, ViralPatterns } from '@/types/viral';
import type { ExtractViralResult } from '@/trigger/extract-viral';

// Force module load to capture run functions
import '@/trigger/extract-viral';

const mockDeriveViralHashtags = vi.mocked(deriveViralHashtags);
const mockSearchViralTiktok = vi.mocked(searchViralTiktok);
const mockSearchViralInstagram = vi.mocked(searchViralInstagram);
const mockUploadFile = vi.mocked(uploadFile);
const mockTranscribeVideo = vi.mocked(transcribeVideo);
const mockExtractHookBodyCta = vi.mocked(extractHookBodyCta);
const mockDetectViralPatterns = vi.mocked(detectViralPatterns);
const mockCreateViralContent = vi.mocked(createViralContent);
const mockUpdateViralContent = vi.mocked(updateViralContent);
const mockUpdateAnalysisViralPatterns = vi.mocked(updateAnalysisViralPatterns);

const getRunFn = () => {
  const runFn = capturedRuns.get('extract-viral');
  if (!runFn) throw new Error('extract-viral run function not captured');
  return runFn;
};

const MOCK_PAYLOAD = {
  analysisId: 'test-analysis-123',
  niche: 'odontologia',
  segment: 'estetica',
  region: 'Brasil',
};

const makeTiktokCandidate = (idx: number): ViralVideoCandidate => ({
  videoUrl: `https://tiktok.com/video/tt_${idx}.mp4`,
  caption: `TikTok video ${idx} sobre odontologia`,
  creatorHandle: `ttcreator${idx}`,
  platform: 'tiktok',
  postDate: '2026-03-20T10:00:00Z',
  durationSeconds: 30,
  engagement: { views: 100000, likes: 5000, comments: 200, shares: 100, saves: 50 },
});

const makeInstagramCandidate = (idx: number): ViralVideoCandidate => ({
  videoUrl: `https://instagram.com/reel/ig_${idx}.mp4`,
  caption: `Instagram reel ${idx} sobre odontologia`,
  creatorHandle: `igcreator${idx}`,
  platform: 'instagram',
  postDate: '2026-03-18T14:00:00Z',
  durationSeconds: 25,
  engagement: { views: 80000, likes: 4000, comments: 150, shares: null, saves: null },
});

const makeViralContentRecord = (idx: number, platform: 'tiktok' | 'instagram'): ViralContent => ({
  id: `vc-${platform}-${idx}`,
  analysisId: 'test-analysis-123',
  platform,
  sourceUrl: platform === 'tiktok' ? `https://tiktok.com/video/tt_${idx}.mp4` : `https://instagram.com/reel/ig_${idx}.mp4`,
  bunnyUrl: `https://cdn.bunny.net/viral/test-analysis-123/${platform}/${String(idx).padStart(2, '0')}.mp4`,
  transcription: null,
  hookBodyCta: null,
  engagementMetrics: { views: 100000, likes: 5000, comments: 200, shares: 100, saves: 50 },
  caption: `${platform} video ${idx}`,
  creatorHandle: `${platform}creator${idx}`,
  durationSeconds: 30,
  postDate: '2026-03-20T10:00:00Z',
  createdAt: '2026-03-28T10:00:00Z',
});

const MOCK_HBC: HookBodyCta = {
  hook: 'Voce sabia que 70% das pessoas fazem clareamento errado?',
  body: 'Estrutura problema-solucao com exemplos visuais.',
  cta: 'Comenta EU se voce ja cometeu algum desses erros!',
  hookDurationSeconds: 3,
  totalDurationSeconds: 32,
};

const MOCK_PATTERNS: ViralPatterns = {
  hookPatterns: [{ pattern: 'Pergunta provocativa', frequency: 4, examples: ['Voce sabia...'] }],
  bodyStructures: [{ structure: 'Problema-solucao', frequency: 5 }],
  ctaPatterns: [{ pattern: 'Engajamento por comentario', frequency: 4, examples: ['Comenta EU'] }],
  dominantTone: 'educacional',
  bestPerformingDuration: { averageSeconds: 30, range: '15-45 segundos' },
  recurringFormulas: [{ formula: 'Pergunta + lista + CTA', videoCount: 4 }],
  totalVideosAnalyzed: 8,
  analysisConfidence: 'high',
};

/** Helper: setup full success scenario defaults */
const setupFullSuccess = () => {
  const ttCandidates = [makeTiktokCandidate(1), makeTiktokCandidate(2)];
  const igCandidates = [makeInstagramCandidate(1), makeInstagramCandidate(2)];

  mockDeriveViralHashtags.mockResolvedValue(['odonto', 'dentista', 'esteticadental', 'sorriso', 'clareamento']);
  mockSearchViralTiktok.mockResolvedValue(ttCandidates);
  mockSearchViralInstagram.mockResolvedValue(igCandidates);

  // fetch returns video buffer
  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  });

  // uploadFile returns CDN URL
  let uploadIdx = 0;
  mockUploadFile.mockImplementation(async (path: string) => {
    uploadIdx++;
    return `https://cdn.bunny.net/${path}`;
  });

  // createViralContent returns records with incrementing IDs
  let contentIdx = 0;
  mockCreateViralContent.mockImplementation(async (input) => {
    contentIdx++;
    return {
      id: `vc-${contentIdx}`,
      analysisId: input.analysisId,
      platform: input.platform,
      sourceUrl: input.sourceUrl,
      bunnyUrl: input.bunnyUrl ?? null,
      transcription: null,
      hookBodyCta: null,
      engagementMetrics: input.engagementMetrics,
      caption: input.caption ?? null,
      creatorHandle: input.creatorHandle ?? null,
      durationSeconds: input.durationSeconds ?? null,
      postDate: input.postDate ?? null,
      createdAt: '2026-03-28T10:00:00Z',
    } as ViralContent;
  });

  // transcribeVideo returns text
  mockTranscribeVideo.mockResolvedValue({
    text: 'Transcricao do video sobre odontologia',
    durationSeconds: 30,
    language: 'pt',
  });

  // extractHookBodyCta returns HBC
  mockExtractHookBodyCta.mockResolvedValue(MOCK_HBC);

  // detectViralPatterns returns patterns
  mockDetectViralPatterns.mockResolvedValue(MOCK_PATTERNS);

  // updateViralContent and updateAnalysisViralPatterns succeed
  mockUpdateViralContent.mockResolvedValue(undefined);
  mockUpdateAnalysisViralPatterns.mockResolvedValue(undefined);
};

describe('extractViral compound task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('deve executar pipeline completo com sucesso: discover, download, transcribe, HBC, patterns', async () => {
    setupFullSuccess();

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('success');
    expect(result.data.viralContent.length).toBe(4); // 2 TikTok + 2 Instagram
    expect(result.data.patterns).not.toBeNull();
    expect(mockDeriveViralHashtags).toHaveBeenCalledWith('odontologia', 'estetica', 'Brasil');
    expect(mockSearchViralTiktok).toHaveBeenCalledWith('odontologia', 'estetica', ['odonto', 'dentista', 'esteticadental', 'sorriso', 'clareamento']);
    expect(mockSearchViralInstagram).toHaveBeenCalledWith('odontologia', 'estetica', ['odonto', 'dentista', 'esteticadental', 'sorriso', 'clareamento']);
    expect(mockCreateViralContent).toHaveBeenCalledTimes(4);
    expect(mockUpdateViralContent).toHaveBeenCalled();
    expect(mockUpdateAnalysisViralPatterns).toHaveBeenCalledWith('test-analysis-123', MOCK_PATTERNS);
  });

  it('deve retornar status "partial" quando TikTok falha mas Instagram funciona', async () => {
    setupFullSuccess();
    mockSearchViralTiktok.mockRejectedValue(new Error('TikTok timeout'));

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('partial');
    expect(result.data.viralContent.length).toBe(2); // Instagram only
    expect(result.data.viralContent.every(v => v.platform === 'instagram')).toBe(true);
  });

  it('deve retornar status "unavailable" quando ambas plataformas falham na descoberta', async () => {
    mockDeriveViralHashtags.mockResolvedValue(['odonto', 'dentista']);
    mockSearchViralTiktok.mockRejectedValue(new Error('TikTok error'));
    mockSearchViralInstagram.mockRejectedValue(new Error('Instagram error'));

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('unavailable');
    expect(result.data.viralContent).toHaveLength(0);
    expect(result.data.patterns).toBeNull();
    expect(result.reason).toBeDefined();
  });

  it('deve retornar status "partial" quando download falha para alguns videos', async () => {
    setupFullSuccess();

    // Make fetch fail for 2nd and 4th video
    let fetchCount = 0;
    mockFetch.mockImplementation(async () => {
      fetchCount++;
      if (fetchCount === 2 || fetchCount === 4) {
        return { ok: false, status: 500, statusText: 'Server Error' };
      }
      return {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      };
    });

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('partial');
    // Only 2 out of 4 videos should have been downloaded
    expect(result.data.viralContent.length).toBe(2);
  });

  it('deve retornar status "partial" quando transcricao falha para alguns videos', async () => {
    setupFullSuccess();

    // Make transcription fail for first call only
    let transcribeCount = 0;
    mockTranscribeVideo.mockImplementation(async () => {
      transcribeCount++;
      if (transcribeCount === 1) {
        throw new Error('Transcription failed');
      }
      return { text: 'Transcricao OK', durationSeconds: 30, language: 'pt' };
    });

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('partial');
    // HBC should have been skipped for the failed transcription
    expect(mockExtractHookBodyCta).toHaveBeenCalledTimes(3); // 4 - 1 failed = 3 transcribed
  });

  it('deve retornar status "partial" quando HBC falha para alguns videos (video ainda tem transcricao)', async () => {
    setupFullSuccess();

    // HBC returns null for first call
    let hbcCount = 0;
    mockExtractHookBodyCta.mockImplementation(async () => {
      hbcCount++;
      if (hbcCount === 1) return null;
      return MOCK_HBC;
    });

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(result.status).toBe('partial');
    // updateViralContent should still be called for transcription update of all videos
    // but hookBodyCta update only for non-null HBC results
    expect(mockUpdateViralContent).toHaveBeenCalled();
  });

  it('deve pular detectViralPatterns quando menos de 2 transcricoes existem (per D-48)', async () => {
    mockDeriveViralHashtags.mockResolvedValue(['odonto', 'dentista']);
    const ttCandidates = [makeTiktokCandidate(1)];
    mockSearchViralTiktok.mockResolvedValue(ttCandidates);
    mockSearchViralInstagram.mockResolvedValue([]);

    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
    mockUploadFile.mockResolvedValue('https://cdn.bunny.net/viral/test-analysis-123/tiktok/01.mp4');
    mockCreateViralContent.mockResolvedValue(makeViralContentRecord(1, 'tiktok'));
    mockTranscribeVideo.mockResolvedValue({ text: 'Transcricao unica', durationSeconds: 30, language: 'pt' });
    mockExtractHookBodyCta.mockResolvedValue(MOCK_HBC);
    mockUpdateViralContent.mockResolvedValue(undefined);

    const result = await getRunFn()(MOCK_PAYLOAD) as ExtractViralResult;

    expect(mockDetectViralPatterns).not.toHaveBeenCalled();
    expect(result.data.patterns).toBeNull();
  });

  it('deve atualizar metadata de progresso em cada estagio do pipeline', async () => {
    setupFullSuccess();

    await getRunFn()(MOCK_PAYLOAD);

    const allCalls = mockMetadata.set.mock.calls as Array<[string, unknown]>;
    const progressCalls = allCalls.filter(([key]) => key === 'viralProgress');

    // Should have multiple viralProgress updates across stages
    expect(progressCalls.length).toBeGreaterThanOrEqual(6);

    // Check stage transitions exist
    const progressValues = progressCalls.map(([, val]) => val as Record<string, string>);
    const hasDiscoverRunning = progressValues.some((p) => p.discover === 'running');
    const hasDownloadRunning = progressValues.some((p) => p.download === 'running');
    const hasTranscribeRunning = progressValues.some((p) => p.transcribe === 'running');
    const hasHbcRunning = progressValues.some((p) => p.hbc === 'running');

    expect(hasDiscoverRunning).toBe(true);
    expect(hasDownloadRunning).toBe(true);
    expect(hasTranscribeRunning).toBe(true);
    expect(hasHbcRunning).toBe(true);
  });

  it('deve fazer upload para Bunny com path correto: viral/{analysisId}/{platform}/{NN}.mp4', async () => {
    setupFullSuccess();

    await getRunFn()(MOCK_PAYLOAD);

    const uploadCalls = mockUploadFile.mock.calls;
    // Should have 4 upload calls (2 TikTok + 2 Instagram)
    expect(uploadCalls.length).toBe(4);

    // Check path format
    const paths = uploadCalls.map(([path]) => path as string);
    expect(paths.some(p => p.match(/^viral\/test-analysis-123\/tiktok\/\d{2}\.mp4$/))).toBe(true);
    expect(paths.some(p => p.match(/^viral\/test-analysis-123\/instagram\/\d{2}\.mp4$/))).toBe(true);
  });

  it('deve criar registro no DB (createViralContent) antes de chamar transcribeVideo (per D-19)', async () => {
    setupFullSuccess();

    const callOrder: string[] = [];
    mockCreateViralContent.mockImplementation(async (input) => {
      callOrder.push('createViralContent');
      return {
        id: `vc-${callOrder.length}`,
        analysisId: input.analysisId,
        platform: input.platform,
        sourceUrl: input.sourceUrl,
        bunnyUrl: input.bunnyUrl ?? null,
        transcription: null,
        hookBodyCta: null,
        engagementMetrics: input.engagementMetrics,
        caption: input.caption ?? null,
        creatorHandle: input.creatorHandle ?? null,
        durationSeconds: input.durationSeconds ?? null,
        postDate: input.postDate ?? null,
        createdAt: '2026-03-28T10:00:00Z',
      } as ViralContent;
    });
    mockTranscribeVideo.mockImplementation(async () => {
      callOrder.push('transcribeVideo');
      return { text: 'Transcricao', durationSeconds: 30, language: 'pt' };
    });

    await getRunFn()(MOCK_PAYLOAD);

    // All createViralContent calls should come before any transcribeVideo call
    const firstTranscribe = callOrder.indexOf('transcribeVideo');
    const lastCreate = callOrder.lastIndexOf('createViralContent');
    expect(firstTranscribe).toBeGreaterThan(lastCreate);
  });
});
