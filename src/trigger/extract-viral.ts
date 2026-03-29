import { task, metadata } from '@trigger.dev/sdk';

import { searchViralTiktok } from '@/lib/apify/tiktok-viral';
import { searchViralInstagram } from '@/lib/apify/instagram-viral';
import { calculateEngagementRate, filterAndSortCandidates } from '@/lib/apify/tiktok-viral';
import { deriveViralHashtags } from '@/lib/ai/derive-hashtags';
import { uploadFile } from '@/lib/storage/bunny';
import { transcribeVideo } from '@/lib/transcription/transcribe';
import { extractHookBodyCta } from '@/lib/ai/hbc-extraction';
import { detectViralPatterns, type PatternDetectionInput } from '@/lib/ai/viral-patterns';
import {
  createViralContent,
  updateViralContent,
  updateAnalysisViralPatterns,
} from '@/lib/supabase/queries';
import type {
  ViralContent,
  ViralVideoCandidate,
  ViralPatterns,
  HookBodyCta,
} from '@/types/viral';

/** Payload para extracao de conteudo viral do nicho */
export interface ExtractViralPayload {
  analysisId: string;
  niche: string;
  segment: string;
  region: string;
}

/** Resultado do pipeline de extracao viral */
export interface ExtractViralResult {
  status: 'success' | 'partial' | 'unavailable';
  data: {
    viralContent: ViralContent[];
    patterns: ViralPatterns | null;
  };
  reason?: string;
}

/** Estado de progresso do pipeline viral (per D-50) */
interface ViralProgress {
  discover: 'pending' | 'running' | 'completed' | 'failed';
  filter: 'pending' | 'running' | 'completed';
  download: 'pending' | 'running' | string | 'completed' | 'failed';
  transcribe: 'pending' | 'running' | string | 'completed' | 'failed';
  hbc: 'pending' | 'running' | string | 'completed' | 'failed';
  patterns: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
}

/** Batch size para downloads paralelos (per D-36) */
const DOWNLOAD_BATCH_SIZE = 5;

/** Delay entre batches de transcricao para AssemblyAI rate limit */
const TRANSCRIPTION_BATCH_SIZE = 5;
const TRANSCRIPTION_BATCH_DELAY_MS = 2000;

/** Resultado de tentativa de download com diagnostico de falha */
interface DownloadAttemptResult {
  record: ViralContent | null;
  failReason?: string;
  platform: string;
}

/**
 * Faz download de um video e armazena no Bunny Storage + DB.
 * Per D-16: path format viral/{analysisId}/{platform}/{NN}.mp4
 * Per D-19: cria registro no DB imediatamente apos upload.
 * @param candidate - Candidato a video viral
 * @param analysisId - ID da analise
 * @param index - Indice global do video (para nomeacao)
 * @returns Resultado com record criado ou motivo da falha
 */
const downloadAndStoreVideo = async (
  candidate: ViralVideoCandidate,
  analysisId: string,
  index: number
): Promise<DownloadAttemptResult> => {
  try {
    const response = await fetch(candidate.videoUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'video/*,application/octet-stream,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Referer': candidate.platform === 'instagram' ? 'https://www.instagram.com/' : 'https://www.tiktok.com/',
      },
    });
    if (!response.ok) {
      return { record: null, failReason: `HTTP ${response.status}`, platform: candidate.platform };
    }

    // Reject non-video responses (e.g. TikTok returning HTML page)
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('video/') && !contentType.startsWith('application/octet-stream')) {
      return { record: null, failReason: `content-type: ${contentType}`, platform: candidate.platform };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const paddedIndex = String(index + 1).padStart(2, '0');
    const filePath = `viral/${analysisId}/${candidate.platform}/${paddedIndex}.mp4`;

    const cdnUrl = await uploadFile(filePath, buffer);

    const record = await createViralContent({
      analysisId,
      platform: candidate.platform,
      sourceUrl: candidate.sourceWebUrl ?? candidate.videoUrl,
      engagementMetrics: candidate.engagement,
      bunnyUrl: cdnUrl,
      caption: candidate.caption,
      creatorHandle: candidate.creatorHandle,
      durationSeconds: candidate.durationSeconds,
      postDate: candidate.postDate,
    });

    return { record, platform: candidate.platform };
  } catch (error) {
    return { record: null, failReason: (error as Error).message, platform: candidate.platform };
  }
};

/**
 * Transcreve video de forma segura (sem lancar excecao).
 * @param bunnyUrl - URL do video no Bunny CDN
 * @returns Resultado da transcricao ou null se falhou
 */
const transcribeVideoSafe = async (
  bunnyUrl: string
): Promise<{ text: string; durationSeconds: number | null } | null> => {
  try {
    const result = await transcribeVideo(bunnyUrl);
    if (!result.text || result.text.trim().length === 0) {
      console.warn(`Aviso: transcricao retornou texto vazio para ${bunnyUrl}`);
      return null;
    }
    return { text: result.text, durationSeconds: result.durationSeconds };
  } catch (error) {
    console.warn(`Aviso: transcricao falhou para ${bunnyUrl}: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Extrai HBC de forma segura (sem lancar excecao).
 * @param transcription - Texto transcrito
 * @param durationSeconds - Duracao do video
 * @returns HookBodyCta ou null se falhou
 */
const extractHbcSafe = async (
  transcription: string,
  durationSeconds: number | null
): Promise<HookBodyCta | null> => {
  try {
    return await extractHookBodyCta(transcription, durationSeconds);
  } catch (error) {
    console.warn(`Aviso: extracao HBC falhou: ${(error as Error).message}`);
    return null;
  }
};

/**
 * Determina status final do pipeline com base nos contadores.
 * @param downloaded - Total de videos baixados
 * @param transcribed - Total de videos transcritos
 * @param totalCandidates - Total de candidatos encontrados
 * @param hbcExtracted - Total de HBC extraidos
 * @param discoveryPartial - Se alguma plataforma falhou na descoberta
 * @returns Status final
 */
const determineStatus = (
  downloaded: number,
  transcribed: number,
  totalCandidates: number,
  hbcExtracted: number,
  discoveryPartial: boolean
): 'success' | 'partial' | 'unavailable' => {
  if (downloaded === 0) return 'unavailable';
  if (discoveryPartial) return 'partial';
  if (
    downloaded === totalCandidates &&
    transcribed === downloaded &&
    hbcExtracted === transcribed
  ) {
    return 'success';
  }
  return 'partial';
};

/**
 * Extrai conteudo viral do nicho (TikTok + Instagram).
 * Pipeline de 6 estagios: discover, filter, download, transcribe, HBC, patterns.
 * Per D-36: estagios sequenciais com operacoes paralelas dentro de cada estagio.
 * Per D-38: retorna resultado estruturado com status e dados.
 */
export const extractViral = task({
  id: 'extract-viral',
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    minTimeoutInMs: 3000,
    maxTimeoutInMs: 8000,
    factor: 2,
  },
  run: async (payload: ExtractViralPayload): Promise<ExtractViralResult> => {
    const { analysisId, niche, segment } = payload;

    const progress: ViralProgress = {
      discover: 'pending',
      filter: 'pending',
      download: 'pending',
      transcribe: 'pending',
      hbc: 'pending',
      patterns: 'pending',
    };

    const updateProgress = (updates: Partial<ViralProgress>) => {
      Object.assign(progress, updates);
      metadata.set('viralProgress', { ...progress });
    };

    try {
      // === Stage 0: Generate viral hashtags via Gemini ===
      let viralHashtags: string[] | undefined;
      try {
        viralHashtags = await deriveViralHashtags(niche, segment, payload.region);
      } catch (error) {
        console.warn(`[Viral] Gemini hashtag derivation failed: ${(error as Error).message}. Using default keywords.`);
      }

      // === Stage 1: Discover (per D-36 step 1) ===
      updateProgress({ discover: 'running' });

      const [ttResult, igResult] = await Promise.allSettled([
        searchViralTiktok(niche, segment, viralHashtags),
        searchViralInstagram(niche, segment, viralHashtags),
      ]);

      const ttCandidates = ttResult.status === 'fulfilled' ? ttResult.value : [];
      const igCandidates = igResult.status === 'fulfilled' ? igResult.value : [];

      const discoveryPartial =
        ttResult.status === 'rejected' || igResult.status === 'rejected';

      if (ttResult.status === 'rejected') {
        const ttErr = (ttResult.reason as Error).message;
        console.warn(`Aviso: busca TikTok falhou: ${ttErr}`);
        metadata.set('tiktokError', ttErr);
      }
      if (igResult.status === 'rejected') {
        const igErr = (igResult.reason as Error).message;
        console.warn(`Aviso: busca Instagram falhou: ${igErr}`);
        metadata.set('instagramError', igErr);
      }

      metadata.set('discoveryCounts', {
        tiktok: ttCandidates.length,
        instagram: igCandidates.length,
        tiktokStatus: ttResult.status,
        instagramStatus: igResult.status,
      });

      if (ttCandidates.length === 0 && igCandidates.length === 0) {
        updateProgress({ discover: 'failed' });
        return {
          status: 'unavailable',
          data: { viralContent: [], patterns: null },
          reason: 'Nenhuma plataforma retornou resultados para o nicho',
        };
      }

      updateProgress({ discover: 'completed' });

      // === Stage 2: Filter — combine with platform diversity, top 5 by engagement ===
      // Take top 3 from each platform so both are represented in the final 5
      updateProgress({ filter: 'running' });
      const ttTop = ttCandidates.slice(0, 3);
      const igTop = igCandidates.slice(0, 3);
      const candidates = filterAndSortCandidates([...ttTop, ...igTop], 5);

      if (candidates.length === 0) {
        updateProgress({ filter: 'completed' });
        return {
          status: 'unavailable',
          data: { viralContent: [], patterns: null },
          reason: 'Nenhum candidato apos filtragem',
        };
      }
      updateProgress({ filter: 'completed' });

      metadata.set('filterResult', {
        candidatesCount: candidates.length,
        platforms: candidates.map(c => c.platform),
      });

      // === Stage 3: Download (per D-36 step 3) ===
      updateProgress({ download: 'running' });
      const downloadedRecords: ViralContent[] = [];
      const downloadFailures: Array<{ platform: string; reason: string }> = [];

      for (let i = 0; i < candidates.length; i += DOWNLOAD_BATCH_SIZE) {
        const batch = candidates.slice(i, i + DOWNLOAD_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((candidate, batchIdx) =>
            downloadAndStoreVideo(candidate, analysisId, i + batchIdx)
          )
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (result.value.record) {
              downloadedRecords.push(result.value.record);
            } else if (result.value.failReason) {
              downloadFailures.push({ platform: result.value.platform, reason: result.value.failReason });
            }
          } else {
            downloadFailures.push({ platform: 'unknown', reason: `rejected: ${result.reason}` });
          }
        }

        updateProgress({
          download: `${downloadedRecords.length}/${candidates.length}`,
        });
      }

      metadata.set('downloadResult', {
        attempted: candidates.length,
        succeeded: downloadedRecords.length,
        platforms: downloadedRecords.map(r => r.platform),
        failures: downloadFailures,
      });

      if (downloadedRecords.length === 0) {
        updateProgress({ download: 'failed' });
        return {
          status: 'unavailable',
          data: { viralContent: [], patterns: null },
          reason: 'Nenhum video pode ser baixado',
        };
      }

      updateProgress({ download: 'completed' });

      // === Stage 4: Transcribe (per D-36 step 4) ===
      updateProgress({ transcribe: 'running' });

      const transcriptionResults: Array<{
        recordIdx: number;
        text: string;
        durationSeconds: number | null;
      }> = [];

      for (let i = 0; i < downloadedRecords.length; i += TRANSCRIPTION_BATCH_SIZE) {
        const batch = downloadedRecords.slice(i, i + TRANSCRIPTION_BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((record) => transcribeVideoSafe(record.bunnyUrl!))
        );

        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          if (result.status === 'fulfilled' && result.value) {
            transcriptionResults.push({
              recordIdx: i + j,
              text: result.value.text,
              durationSeconds: result.value.durationSeconds,
            });
            await updateViralContent(downloadedRecords[i + j].id, {
              transcription: result.value.text,
            });
          }
        }

        updateProgress({
          transcribe: `${transcriptionResults.length}/${downloadedRecords.length}`,
        });

        // Rate limit delay between batches if more remain
        if (i + TRANSCRIPTION_BATCH_SIZE < downloadedRecords.length) {
          await new Promise((resolve) => setTimeout(resolve, TRANSCRIPTION_BATCH_DELAY_MS));
        }
      }

      updateProgress({ transcribe: 'completed' });

      // === Stage 5: Per-video HBC (per D-36 step 5) ===
      updateProgress({ hbc: 'running' });

      let hbcSuccessCount = 0;
      const transcribedRecords = transcriptionResults.map((tr) => ({
        record: downloadedRecords[tr.recordIdx],
        transcription: tr.text,
        durationSeconds: tr.durationSeconds,
      }));

      const hbcResults = await Promise.allSettled(
        transcribedRecords.map(({ transcription, durationSeconds }) =>
          extractHbcSafe(transcription, durationSeconds)
        )
      );

      for (let i = 0; i < hbcResults.length; i++) {
        const result = hbcResults[i];
        if (result.status === 'fulfilled' && result.value) {
          hbcSuccessCount++;
          await updateViralContent(transcribedRecords[i].record.id, {
            hookBodyCta: result.value,
          });
        }
      }

      updateProgress({ hbc: `${hbcSuccessCount}/${transcribedRecords.length}` });
      updateProgress({ hbc: 'completed' });

      // === Stage 6: Cross-video Patterns (per D-36 step 6) ===
      let patterns: ViralPatterns | null = null;

      if (transcriptionResults.length < 2) {
        updateProgress({ patterns: 'skipped' });
      } else {
        updateProgress({ patterns: 'running' });

        const patternInputs: PatternDetectionInput[] = transcribedRecords.map(
          ({ record, transcription, durationSeconds }) => ({
            transcription,
            platform: record.platform,
            caption: record.caption ?? '',
            durationSeconds: durationSeconds ?? record.durationSeconds,
            engagementRate: calculateEngagementRate(record.engagementMetrics),
          })
        );

        patterns = await detectViralPatterns(patternInputs);

        if (patterns) {
          await updateAnalysisViralPatterns(analysisId, patterns);
        }

        updateProgress({ patterns: 'completed' });
      }

      // === Return ===
      const status = determineStatus(
        downloadedRecords.length,
        transcriptionResults.length,
        candidates.length,
        hbcSuccessCount,
        discoveryPartial
      );

      return {
        status,
        data: {
          viralContent: downloadedRecords,
          patterns,
        },
      };
    } catch (error) {
      metadata.set('status', 'failed');
      return {
        status: 'unavailable',
        data: { viralContent: [], patterns: null },
        reason: `Erro inesperado no pipeline viral: ${(error as Error).message}`,
      };
    }
  },
});
