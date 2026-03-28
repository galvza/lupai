import { task, metadata, wait, batch } from '@trigger.dev/sdk';

import { discoverFromGoogleSearch, discoverFromGoogleMaps, discoverFromFacebookAds, discoverFromSimilarWeb } from './discover-competitors';
import { extractWebsite } from './extract-website';
import { extractSocial } from './extract-social';
import { extractAds } from './extract-ads';
import { extractViral } from './extract-viral';
import { scoreCompetitorsWithAI } from '@/lib/ai/score-competitors';
import { filterBlockedDomains, deduplicateCandidates } from '@/utils/competitors';
import { findSocialProfilesViaSearch, mergeSocialSources } from '@/utils/socialFallback';
import { createCompetitor, updateAnalysis } from '@/lib/supabase/queries';
import type { RawCompetitorCandidate } from '@/utils/competitors';
import type { ScoredCompetitor } from '@/lib/ai/score-competitors';
import type { ExtractWebsiteResult, SocialLinks, SocialProfileInput } from '@/types/competitor';

/** Payload para o job de analise de mercado */
export interface AnalyzeMarketPayload {
  analysisId: string;
  niche: string;
  segment: string;
  region: string;
  mode: 'quick' | 'complete';
  userBusinessUrl: string | null;
}

/** Resultado da confirmacao do usuario */
interface ConfirmedCompetitors {
  competitors: ScoredCompetitor[];
}

/**
 * Job principal de analise de mercado.
 * Orquestra toda a cascata: descoberta -> scoring -> confirmacao -> extracao.
 */
export const analyzeMarket = task({
  id: 'analyze-market',
  maxDuration: 300,
  run: async (payload: AnalyzeMarketPayload) => {
    try {
      // Step 1: Update status to discovering
      await updateAnalysis(payload.analysisId, { status: 'discovering' });
      metadata.set('status', 'discovering');
      metadata.set('step', 'Descobrindo concorrentes...');
      metadata.set('progress', 10);

      // Step 2: Fan-out discovery via batch
      const { runs: discoveryRuns } = await batch.triggerByTaskAndWait([
        { task: discoverFromGoogleSearch, payload: { niche: payload.niche, segment: payload.segment, region: payload.region } },
        { task: discoverFromGoogleMaps, payload: { niche: payload.niche, segment: payload.segment, region: payload.region } },
        { task: discoverFromFacebookAds, payload: { niche: payload.niche, segment: payload.segment, region: payload.region } },
        { task: discoverFromSimilarWeb, payload: { niche: payload.niche, segment: payload.segment, region: payload.region, seedUrl: payload.userBusinessUrl ?? undefined } },
      ]);

      // Step 3: Collect successful results (D-29)
      const allCandidates: RawCompetitorCandidate[] = discoveryRuns
        .filter((r) => r.ok)
        .flatMap((r) => r.output as RawCompetitorCandidate[]);

      const failedSources = discoveryRuns.filter((r) => !r.ok).length;
      if (failedSources > 0) {
        metadata.set('warnings', `${failedSources} fonte(s) de descoberta falharam`);
      }

      // Step 4: Check if ALL failed (D-28)
      if (allCandidates.length === 0) {
        await updateAnalysis(payload.analysisId, { status: 'failed' });
        metadata.set('status', 'failed');
        metadata.set('error', 'Nao foi possivel encontrar concorrentes para este nicho. Tente descrever de outra forma.');
        throw new Error('Nao foi possivel encontrar concorrentes para este nicho. Tente descrever de outra forma.');
      }

      // Step 5: Filter and deduplicate (D-03, D-04, D-05, D-06)
      metadata.set('step', 'Filtrando resultados...');
      metadata.set('progress', 30);
      const filtered = filterBlockedDomains(allCandidates);
      const deduplicated = deduplicateCandidates(filtered);

      // Step 6: Score with Gemini (D-10, D-11, D-12, D-13) with fallback (D-30)
      metadata.set('step', 'Analisando relevancia...');
      metadata.set('progress', 45);

      let scored: ScoredCompetitor[];
      try {
        scored = await scoreCompetitorsWithAI(deduplicated, payload.niche, payload.segment, payload.region);
      } catch {
        // Fallback per D-30: return top candidates without scoring
        scored = deduplicated.slice(0, 4).map((c) => ({
          name: c.name,
          url: c.url,
          score: 50,
          segmentMatch: 0,
          productMatch: 0,
          sizeMatch: 0,
          regionMatch: 0,
          digitalPresence: 0,
          reasoning: 'Scoring automatico indisponivel. Candidato selecionado por relevancia de fonte.',
          socialProfiles: { instagram: null, tiktok: null, facebook: null },
        }));
        metadata.set('warnings', 'Scoring com IA indisponivel. Usando selecao por relevancia.');
      }

      // Step 7: Handle few results (D-31)
      if (scored.length === 0) {
        await updateAnalysis(payload.analysisId, { status: 'failed' });
        metadata.set('status', 'failed');
        metadata.set('error', 'Nenhum concorrente qualificado encontrado para este nicho.');
        throw new Error('Nenhum concorrente qualificado encontrado para este nicho.');
      }

      if (scored.length < 3) {
        metadata.set('note', `Apenas ${scored.length} concorrente(s) qualificado(s) encontrado(s).`);
      }

      // Step 8: Pause for user confirmation (D-14, D-15, D-17, D-19)
      await updateAnalysis(payload.analysisId, { status: 'waiting_confirmation' });
      metadata.set('status', 'waiting_confirmation');
      metadata.set('step', 'Aguardando confirmacao...');
      metadata.set('progress', 55);
      metadata.set('candidates', scored);

      const token = await wait.createToken({ timeout: '1h' });
      metadata.set('confirmationTokenId', token.id);

      const confirmResult = await wait.forToken<ConfirmedCompetitors>(token.id);

      if (!confirmResult.ok) {
        await updateAnalysis(payload.analysisId, { status: 'failed' });
        metadata.set('status', 'failed');
        throw new Error('Confirmacao expirou. Inicie uma nova analise.');
      }

      // Step 9: Persist confirmed competitors (D-16)
      const confirmedCompetitors = confirmResult.output.competitors;
      metadata.set('step', 'Salvando concorrentes...');
      metadata.set('progress', 60);

      const savedCompetitors = await Promise.all(
        confirmedCompetitors.map((comp) =>
          createCompetitor({
            analysisId: payload.analysisId,
            name: comp.name,
            websiteUrl: comp.url,
          })
        )
      );

      // Step 10a: Batch 1 — Website extraction + Viral (parallel, no deps on each other)
      await updateAnalysis(payload.analysisId, { status: 'extracting' });
      metadata.set('status', 'extracting');
      metadata.set('step', 'Extraindo dados dos sites...');
      metadata.set('progress', 65);

      // Initialize sub-task progress tracking per D-47
      const subTaskProgress: Record<string, Record<string, string>> = {};
      savedCompetitors.forEach((comp) => {
        subTaskProgress[comp.name] = { website: 'running', seo: 'running', social: 'pending', ads: 'pending' };
      });
      metadata.set('subTasks', subTaskProgress);

      const batch1Items = [
        ...savedCompetitors.map((comp) => ({
          task: extractWebsite,
          payload: { analysisId: payload.analysisId, competitorId: comp.id, competitorName: comp.name, websiteUrl: comp.websiteUrl ?? '' },
        })),
        { task: extractViral, payload: { analysisId: payload.analysisId, niche: payload.niche, segment: payload.segment, region: payload.region } },
      ];

      const { runs: batch1Runs } = await batch.triggerByTaskAndWait(batch1Items);

      // Step 10b: Collect social links from Batch 1 and merge with AI hints
      metadata.set('step', 'Descobrindo perfis sociais...');
      metadata.set('progress', 75);

      const websiteRuns = batch1Runs.slice(0, savedCompetitors.length);
      const socialProfilesPerCompetitor: Array<{ instagram: SocialProfileInput | null; tiktok: SocialProfileInput | null }> = [];

      const emptySocialLinks: SocialLinks = { instagram: null, tiktok: null, facebook: null, youtube: null, linkedin: null, twitter: null };

      for (let i = 0; i < savedCompetitors.length; i++) {
        const run = websiteRuns[i];
        const scoredComp = confirmedCompetitors[i];
        const aiHints = scoredComp?.socialProfiles ?? { instagram: null, tiktok: null, facebook: null };

        let websiteLinks: SocialLinks = emptySocialLinks;
        if (run.ok) {
          const result = run.output as ExtractWebsiteResult;
          websiteLinks = result.socialLinks ?? emptySocialLinks;
          subTaskProgress[savedCompetitors[i].name].website = 'completed';
          subTaskProgress[savedCompetitors[i].name].seo = 'completed';
        } else {
          subTaskProgress[savedCompetitors[i].name].website = 'failed';
          subTaskProgress[savedCompetitors[i].name].seo = 'failed';
        }

        // Find missing platforms for Google Search fallback (per D-14, D-15)
        const missingPlatforms: string[] = [];
        if (!websiteLinks.instagram) missingPlatforms.push('instagram');
        if (!websiteLinks.tiktok) missingPlatforms.push('tiktok');

        let searchResults: Record<string, SocialProfileInput | null> = {};
        if (missingPlatforms.length > 0) {
          try {
            searchResults = await findSocialProfilesViaSearch(savedCompetitors[i].name, missingPlatforms);
          } catch {
            // Per D-42: fallback failure is not critical, proceed with what we have
          }
        }

        // Merge: website > search_fallback > ai_hint (per D-19, D-26)
        const merged = mergeSocialSources(websiteLinks, searchResults, aiHints);
        socialProfilesPerCompetitor.push(merged);
      }

      metadata.set('subTasks', subTaskProgress);

      // Step 10c: Batch 2 — Social extraction + Ads (parallel, using data from Batch 1)
      metadata.set('step', 'Extraindo redes sociais e anuncios...');
      metadata.set('progress', 80);

      savedCompetitors.forEach((comp) => {
        subTaskProgress[comp.name].social = 'running';
        subTaskProgress[comp.name].ads = 'running';
      });
      metadata.set('subTasks', subTaskProgress);

      const batch2Items = [
        ...savedCompetitors.map((comp, i) => ({
          task: extractSocial,
          payload: {
            analysisId: payload.analysisId,
            competitorId: comp.id,
            competitorName: comp.name,
            socialProfiles: socialProfilesPerCompetitor[i],
          },
        })),
        ...savedCompetitors.map((comp) => ({
          task: extractAds,
          payload: { analysisId: payload.analysisId, competitorId: comp.id, competitorName: comp.name, websiteUrl: comp.websiteUrl ?? '' },
        })),
      ];

      const { runs: batch2Runs } = await batch.triggerByTaskAndWait(batch2Items);

      // Step 11: Summarize results from both batches
      const allRuns = [...batch1Runs, ...batch2Runs];
      const successCount = allRuns.filter((r) => r.ok).length;
      const failCount = allRuns.filter((r) => !r.ok).length;

      // Update final sub-task status
      const socialRuns = batch2Runs.slice(0, savedCompetitors.length);
      socialRuns.forEach((run, i) => {
        subTaskProgress[savedCompetitors[i].name].social = run.ok ? 'completed' : 'failed';
      });
      const adsRuns = batch2Runs.slice(savedCompetitors.length);
      adsRuns.forEach((run, i) => {
        if (i < savedCompetitors.length) {
          subTaskProgress[savedCompetitors[i].name].ads = run.ok ? 'completed' : 'failed';
        }
      });
      metadata.set('subTasks', subTaskProgress);

      metadata.set('step', 'Extracao concluida');
      metadata.set('progress', 95);
      metadata.set('extractionSummary', { success: successCount, failed: failCount, total: allRuns.length });

      await updateAnalysis(payload.analysisId, { status: 'completed' });
      metadata.set('status', 'completed');
      metadata.set('progress', 100);

      return {
        analysisId: payload.analysisId,
        competitorsFound: savedCompetitors.length,
        extractionSuccess: successCount,
        extractionFailed: failCount,
      };
    } catch (error) {
      await updateAnalysis(payload.analysisId, { status: 'failed' }).catch(() => {});
      metadata.set('status', 'failed');
      metadata.set('error', (error as Error).message);
      throw error;
    }
  },
});
