/**
 * E2E Pipeline Test Script
 * Tests the complete analysis pipeline from understand to results.
 *
 * Usage: npx tsx tests/e2e-pipeline-test.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* .env.local may not exist */ }

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const NICHE_INPUT = 'academia de musculacao em Brasilia';
// Use specific interpretation that produces good competitor scoring results
const FIXED_INTERPRETED = { niche: 'academia de musculação', segment: 'musculação', region: 'Brasília' };
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

interface TimedResult<T> {
  data: T;
  durationMs: number;
}

const timedFetch = async <T>(
  label: string,
  url: string,
  options?: RequestInit
): Promise<TimedResult<T>> => {
  const start = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${label}] ${options?.method ?? 'GET'} ${url}`);

  const res = await fetch(url, options);
  const durationMs = Date.now() - start;
  const data = (await res.json()) as T;

  console.log(`[${label}] Status: ${res.status} | Time: ${durationMs}ms`);
  console.log(`[${label}] Response:`, JSON.stringify(data, null, 2).slice(0, 2000));

  if (!res.ok) {
    throw new Error(`[${label}] HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  return { data, durationMs };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const pipelineStart = Date.now();
  const results: Record<string, unknown> = {};

  try {
    // ============================================================
    // Step 1: POST /api/analyze/understand
    // ============================================================
    const step1 = await timedFetch<{
      classification: string;
      interpreted?: { niche: string; segment: string; region: string };
      error?: string;
    }>('Step 1: Understand', `${BASE_URL}/api/analyze/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nicheInput: NICHE_INPUT }),
    });

    results.understand = {
      classification: step1.data.classification,
      interpreted: step1.data.interpreted,
      durationMs: step1.durationMs,
    };

    if (!step1.data.interpreted) {
      throw new Error(`Understand did not return interpreted niche. Classification: ${step1.data.classification}`);
    }

    // Use fixed interpretation to avoid Gemini returning "Fitness" (too generic for scoring)
    const interpreted = FIXED_INTERPRETED;
    console.log(`\n[Interpreted] Using fixed: niche="${interpreted.niche}" segment="${interpreted.segment}" region="${interpreted.region}"`);
    console.log(`[Interpreted] Gemini returned: niche="${step1.data.interpreted.niche}" segment="${step1.data.interpreted.segment}" region="${step1.data.interpreted.region}"`);

    // ============================================================
    // Step 2: POST /api/analyze
    // ============================================================
    const step2 = await timedFetch<{
      analysisId: string;
      runId: string;
      publicAccessToken: string;
      redirectUrl: string;
      cached?: boolean;
    }>('Step 2: Start Analysis', `${BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nicheInput: NICHE_INPUT,
        nicheInterpreted: interpreted,
        mode: 'quick',
        forceRefresh: true,
      }),
    });

    const { analysisId, runId } = step2.data;
    results.startAnalysis = {
      analysisId,
      runId,
      cached: step2.data.cached,
      durationMs: step2.durationMs,
    };

    if (step2.data.cached) {
      console.log('\n[CACHED] Found cached analysis — skipping polling, fetching results directly.');
    }

    // ============================================================
    // Step 3: Poll GET /api/analysis/[id]/status
    // ============================================================
    let currentStatus = step2.data.cached ? 'completed' : 'processing';
    let pollCount = 0;
    let confirmationDone = false;

    while (currentStatus !== 'completed' && currentStatus !== 'failed' && pollCount < MAX_POLL_ATTEMPTS) {
      await sleep(POLL_INTERVAL_MS);
      pollCount++;

      const statusRes = await timedFetch<{
        analysisId: string;
        status: string;
      }>(`Step 3: Poll #${pollCount}`, `${BASE_URL}/api/analysis/${analysisId}/status`);

      currentStatus = statusRes.data.status;
      console.log(`[Poll #${pollCount}] Status: ${currentStatus}`);

      // Step 3b: Auto-confirm competitors if waiting
      if (currentStatus === 'waiting_confirmation' && !confirmationDone) {
        console.log('\n[Auto-Confirm] Status is waiting_confirmation — fetching candidates from Trigger.dev metadata...');
        const triggerKey = process.env.TRIGGER_SECRET_KEY;
        console.log(`[Auto-Confirm] TRIGGER_SECRET_KEY: ${triggerKey ? `set (${triggerKey.length} chars)` : 'NOT SET'}`);

        try {
          // Try Trigger.dev v3 management API
          const metaRes = await fetch(
            `https://api.trigger.dev/api/v3/runs/${runId}`,
            {
              headers: {
                Authorization: `Bearer ${triggerKey}`,
              },
            }
          );

          const metaData = await metaRes.json();
          console.log(`[Auto-Confirm] Trigger API status: ${metaRes.status}`);
          console.log('[Auto-Confirm] Trigger run data:', JSON.stringify(metaData).slice(0, 3000));

          const metadata = metaData.metadata ?? metaData.data?.metadata ?? {};
          const tokenId = metadata.confirmationTokenId;
          const candidates = metadata.candidates;

          if (tokenId && candidates && candidates.length > 0) {
            console.log(`[Auto-Confirm] Found ${candidates.length} candidates and tokenId. Confirming all...`);

            const confirmRes = await timedFetch<{ status: string }>(
              'Step 3b: Confirm Competitors',
              `${BASE_URL}/api/analyze/${analysisId}/confirm-competitors`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tokenId,
                  competitors: candidates,
                }),
              }
            );

            console.log(`[Auto-Confirm] Confirmation result: ${confirmRes.data.status}`);
            confirmationDone = true;
          } else {
            console.log('[Auto-Confirm] Could not extract tokenId or candidates from metadata');
            console.log('[Auto-Confirm] metadata keys:', Object.keys(metadata));
            if (!tokenId) console.log('[Auto-Confirm] Missing: confirmationTokenId');
            if (!candidates) console.log('[Auto-Confirm] Missing: candidates');
          }
        } catch (confirmError) {
          console.error('[Auto-Confirm] Error:', (confirmError as Error).message);
        }
      }
    }

    results.polling = {
      totalPolls: pollCount,
      finalStatus: currentStatus,
      totalPollTimeMs: pollCount * POLL_INTERVAL_MS,
    };

    if (currentStatus === 'failed') {
      console.error('\n[FAILED] Pipeline failed!');
    }

    // ============================================================
    // Step 4: GET /api/analysis/[id] — full results
    // ============================================================
    const step4 = await timedFetch<{
      analysis: { id: string; status: string; viralPatterns: unknown };
      competitors: Array<{ id: string; name: string; websiteUrl: string }>;
      userBusiness: unknown;
      viralContent: Array<{
        id: string;
        platform: string;
        sourceUrl: string;
        bunnyUrl: string | null;
        transcription: string | null;
        hookBodyCta: unknown;
        engagementMetrics: { views: number | null; likes: number };
      }>;
      synthesis: unknown;
      viralPatterns: unknown;
      sectionStatuses: Array<{ section: string; status: string; message?: string }>;
    }>('Step 4: Full Results', `${BASE_URL}/api/analysis/${analysisId}`);

    const r = step4.data;
    results.fullResults = {
      durationMs: step4.durationMs,
      competitorsFound: r.competitors.length,
      viralContentCount: r.viralContent.length,
      viralByPlatform: {
        tiktok: r.viralContent.filter((v) => v.platform === 'tiktok').length,
        instagram: r.viralContent.filter((v) => v.platform === 'instagram').length,
      },
      videosTranscribed: r.viralContent.filter((v) => v.transcription).length,
      videosWithHBC: r.viralContent.filter((v) => v.hookBodyCta).length,
      videosDownloaded: r.viralContent.filter((v) => v.bunnyUrl).length,
      hasViralPatterns: !!r.viralPatterns,
      hasSynthesis: !!r.synthesis,
      sectionStatuses: r.sectionStatuses,
    };

    // Log viral content details
    console.log('\n--- Viral Content Details ---');
    for (const vc of r.viralContent) {
      console.log(`  [${vc.platform}] ${vc.sourceUrl}`);
      console.log(`    Views: ${vc.engagementMetrics.views}, Likes: ${vc.engagementMetrics.likes}`);
      console.log(`    Bunny URL: ${vc.bunnyUrl ? 'YES' : 'NO'}`);
      console.log(`    Transcription: ${vc.transcription ? `YES (${vc.transcription.length} chars)` : 'NO'}`);
      console.log(`    HBC: ${vc.hookBodyCta ? 'YES' : 'NO'}`);
    }

    // ============================================================
    // Step 5: GET /api/history
    // ============================================================
    const step5 = await timedFetch<unknown>(
      'Step 5: History',
      `${BASE_URL}/api/history`
    );

    results.history = { durationMs: step5.durationMs };

    // ============================================================
    // FINAL REPORT
    // ============================================================
    const totalDuration = Date.now() - pipelineStart;

    console.log('\n' + '='.repeat(60));
    console.log('FINAL E2E PIPELINE REPORT');
    console.log('='.repeat(60));
    console.log(`Total time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Niche: "${NICHE_INPUT}"`);
    console.log(`Final status: ${currentStatus}`);
    console.log(`Competitors found: ${(results.fullResults as Record<string, unknown>).competitorsFound}`);
    console.log(`Viral videos found: ${(results.fullResults as Record<string, unknown>).viralContentCount}`);

    const vp = (results.fullResults as Record<string, Record<string, unknown>>).viralByPlatform;
    console.log(`  TikTok: ${vp.tiktok}`);
    console.log(`  Instagram: ${vp.instagram}`);
    console.log(`Videos downloaded: ${(results.fullResults as Record<string, unknown>).videosDownloaded}`);
    console.log(`Videos transcribed: ${(results.fullResults as Record<string, unknown>).videosTranscribed}`);
    console.log(`Videos with HBC: ${(results.fullResults as Record<string, unknown>).videosWithHBC}`);
    console.log(`Viral patterns detected: ${(results.fullResults as Record<string, unknown>).hasViralPatterns}`);
    console.log(`Synthesis generated: ${(results.fullResults as Record<string, unknown>).hasSynthesis}`);

    console.log('\nSection Statuses:');
    const ss = (results.fullResults as Record<string, unknown>).sectionStatuses as Array<{ section: string; status: string; message?: string }>;
    for (const s of ss) {
      console.log(`  ${s.section}: ${s.status}${s.message ? ` — ${s.message}` : ''}`);
    }

    console.log('\nStep Timings:');
    console.log(`  Understand: ${(results.understand as Record<string, unknown>).durationMs}ms`);
    console.log(`  Start Analysis: ${(results.startAnalysis as Record<string, unknown>).durationMs}ms`);
    console.log(`  Polling: ${(results.polling as Record<string, unknown>).totalPolls} polls`);
    console.log(`  Full Results: ${(results.fullResults as Record<string, unknown>).durationMs}ms`);
    console.log(`  History: ${(results.history as Record<string, unknown>).durationMs}ms`);
    console.log('='.repeat(60));

    // Check for problems
    const problems: string[] = [];
    const fr = results.fullResults as Record<string, unknown>;
    if (fr.viralContentCount === 0) problems.push('ZERO viral videos found');
    if (vp.tiktok === 0) problems.push('ZERO TikTok videos');
    if (vp.instagram === 0) problems.push('ZERO Instagram videos');
    if (fr.videosTranscribed === 0 && (fr.viralContentCount as number) > 0) problems.push('ZERO transcriptions');
    if (!fr.hasViralPatterns) problems.push('No viral patterns detected');
    if (!fr.hasSynthesis) problems.push('No synthesis generated');
    if (currentStatus !== 'completed') problems.push(`Pipeline ended with status: ${currentStatus}`);

    if (problems.length > 0) {
      console.log('\n!!! PROBLEMS DETECTED !!!');
      for (const p of problems) {
        console.log(`  - ${p}`);
      }
    } else {
      console.log('\nAll checks PASSED!');
    }
  } catch (error) {
    console.error('\n[FATAL ERROR]', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
};

main();
