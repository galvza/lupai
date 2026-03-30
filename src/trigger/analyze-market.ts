import { task, metadata } from '@trigger.dev/sdk';

import { discoverFromGoogleSearch, discoverFromGoogleMaps, discoverFromFacebookAds, discoverFromSimilarWeb } from './discover-competitors';
import { extractWebsite } from './extract-website';
import { extractSocial } from './extract-social';
import { extractAds } from './extract-ads';
import { extractViral } from './extract-viral';
import { synthesizeTask } from './synthesize';
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

/** Resultado da confirmacao do usuario (mantido para reuso futuro) */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ConfirmedCompetitors {
  competitors: ScoredCompetitor[];
}

/**
 * Job principal de analise de mercado.
 * Orquestra toda a cascata: descoberta -> scoring -> confirmacao -> extracao.
 */
export const analyzeMarket = task({
  id: 'analyze-market',
  maxDuration: 900,
  run: async (payload: AnalyzeMarketPayload) => {
    const emptySocialLinks: SocialLinks = { instagram: null, tiktok: null, facebook: null, youtube: null, linkedin: null, twitter: null };

    try {
      // Step 1: Update status to discovering
      await updateAnalysis(payload.analysisId, { status: 'discovering' });
      metadata.set('status', 'discovering');
      metadata.set('step', 'Descobrindo concorrentes...');
      metadata.set('progress', 10);

      // Step 1.5: User business extraction (Modo Completo per D-02, D-11)
      if (payload.mode === 'complete' && payload.userBusinessUrl) {
        metadata.set('step', 'Analisando seu negocio...');
        metadata.set('progress', 5);

        // Derive business name from URL (per research recommendation)
        let userBusinessName: string;
        try {
          userBusinessName = new URL(payload.userBusinessUrl).hostname.replace(/^www\./, '');
        } catch {
          userBusinessName = payload.userBusinessUrl;
        }

        try {
          // Create user business record (per D-05, D-12)
          const userBusiness = await createCompetitor({
            analysisId: payload.analysisId,
            name: userBusinessName,
            websiteUrl: payload.userBusinessUrl,
            role: 'user_business',
          });

          // User Batch A: website extraction (per D-03, D-13)
          const websiteResult = await extractWebsite.triggerAndWait({
            analysisId: payload.analysisId,
            competitorId: userBusiness.id,
            competitorName: userBusiness.name,
            websiteUrl: payload.userBusinessUrl,
          });

          if (websiteResult.ok) {
            const result = websiteResult.output as ExtractWebsiteResult;
            const userSocialLinks = result.socialLinks ?? emptySocialLinks;

            metadata.set('step', 'Analisando suas redes sociais e anuncios...');
            metadata.set('progress', 12);

            // Social link fallback for missing platforms
            const missingPlatforms: string[] = [];
            if (!userSocialLinks.instagram) missingPlatforms.push('instagram');
            if (!userSocialLinks.tiktok) missingPlatforms.push('tiktok');

            let searchResults: Record<string, SocialProfileInput | null> = {};
            if (missingPlatforms.length > 0) {
              try {
                searchResults = await findSocialProfilesViaSearch(userBusiness.name, missingPlatforms);
              } catch { /* fallback failure not critical */ }
            }

            const merged = mergeSocialSources(
              userSocialLinks,
              searchResults,
              { instagram: null, tiktok: null, facebook: null }
            );

            // User social + ads sequencial (Apify memory limit)
            await extractSocial.triggerAndWait({
              analysisId: payload.analysisId,
              competitorId: userBusiness.id,
              competitorName: userBusiness.name,
              socialProfiles: merged,
            });
            await extractAds.triggerAndWait({
              analysisId: payload.analysisId,
              competitorId: userBusiness.id,
              competitorName: userBusiness.name,
              websiteUrl: payload.userBusinessUrl,
              region: payload.region,
            });
          } else {
            // Website extraction failed but we still continue per D-29
            console.warn('Aviso: extracao do site do usuario falhou. Continuando com pipeline de concorrentes.');
            metadata.set('modoCompleto', 'degraded');
            metadata.set('modoCompletoReason', 'Nao foi possivel analisar seu site completamente. Mostrando analise do mercado com comparacao parcial.');
          }

          metadata.set('progress', 18);
        } catch (error) {
          // D-28: User extraction failure does NOT block competitor pipeline
          console.warn(`Aviso: extracao do negocio do usuario falhou: ${(error as Error).message}`);
          metadata.set('modoCompleto', 'degraded');
          metadata.set('modoCompletoReason', 'Nao foi possivel analisar seu site. Mostrando analise do mercado sem comparacao.');
        }
      }

      // Step 2: Discovery sequencial (Apify memory limit — 1 actor por vez)
      const discoveryPayload = { niche: payload.niche, segment: payload.segment, region: payload.region };
      const discoveryTasks = [
        { task: discoverFromGoogleSearch, payload: discoveryPayload },
        { task: discoverFromGoogleMaps, payload: discoveryPayload },
        { task: discoverFromFacebookAds, payload: discoveryPayload },
        { task: discoverFromSimilarWeb, payload: { ...discoveryPayload, seedUrl: payload.userBusinessUrl ?? undefined } },
      ] as const;

      const discoveryRuns: Array<{ ok: boolean; output?: RawCompetitorCandidate[] }> = [];
      for (const item of discoveryTasks) {
        const result = await item.task.triggerAndWait(item.payload);
        discoveryRuns.push({ ok: result.ok, output: result.ok ? result.output as RawCompetitorCandidate[] : undefined });
      }

      // Step 3: Collect successful results (D-29)
      const allCandidates: RawCompetitorCandidate[] = discoveryRuns
        .filter((r) => r.ok && r.output)
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

      // Step 8: Auto-confirm all scored competitors (waitpoint removed)
      metadata.set('step', 'Salvando concorrentes...');
      metadata.set('progress', 58);
      metadata.set('candidates', scored);

      const confirmedCompetitors = scored;

      const savedCompetitors = await Promise.all(
        confirmedCompetitors.map((comp) =>
          createCompetitor({
            analysisId: payload.analysisId,
            name: comp.name,
            websiteUrl: comp.url,
          })
        )
      );

      // Step 10a: Batch 1 — Website extraction (parallel per competitor)
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

      // Website extraction sequencial (Apify memory limit — 1 competitor por vez)
      const websiteRuns: Array<{ ok: boolean; output?: ExtractWebsiteResult }> = [];
      for (const comp of savedCompetitors) {
        const result = await extractWebsite.triggerAndWait({
          analysisId: payload.analysisId,
          competitorId: comp.id,
          competitorName: comp.name,
          websiteUrl: comp.websiteUrl ?? '',
        });
        websiteRuns.push({ ok: result.ok, output: result.ok ? result.output as ExtractWebsiteResult : undefined });
      }

      // Step 10b: Collect social links and merge with AI hints
      metadata.set('step', 'Descobrindo perfis sociais...');
      metadata.set('progress', 75);

      const socialProfilesPerCompetitor: Array<{ instagram: SocialProfileInput | null; tiktok: SocialProfileInput | null }> = [];

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

      // Social + Ads extraction sequencial (Apify memory limit — 1 competitor por vez)
      for (let i = 0; i < savedCompetitors.length; i++) {
        const comp = savedCompetitors[i];

        const socialResult = await extractSocial.triggerAndWait({
          analysisId: payload.analysisId,
          competitorId: comp.id,
          competitorName: comp.name,
          socialProfiles: socialProfilesPerCompetitor[i],
        });
        subTaskProgress[comp.name].social = socialResult.ok ? 'completed' : 'failed';

        const adsResult = await extractAds.triggerAndWait({
          analysisId: payload.analysisId,
          competitorId: comp.id,
          competitorName: comp.name,
          websiteUrl: comp.websiteUrl ?? '',
          region: payload.region,
        });
        subTaskProgress[comp.name].ads = adsResult.ok ? 'completed' : 'failed';

        metadata.set('subTasks', subTaskProgress);
      }

      // Step 10d: Batch 3 — Viral extraction (runs alone after competitors free Apify memory)
      metadata.set('step', 'Buscando conteudo viral do nicho...');
      metadata.set('progress', 85);

      const viralRun = await extractViral.triggerAndWait({
        analysisId: payload.analysisId,
        niche: payload.niche,
        segment: payload.segment,
        region: payload.region,
      });

      if (viralRun.ok) {
        const viralResult = viralRun.output as { status?: string; data?: { viralContent?: unknown[]; patterns?: unknown } } | undefined;
        const viralCount = viralResult?.data?.viralContent?.length ?? 0;
        console.log(`[Viral] Extração concluída: ${viralCount} vídeos, status=${viralResult?.status ?? 'unknown'}`);
      } else {
        console.warn(`[Viral] Extração falhou: ${String(viralRun.error)}`);
      }

      // Step 11: Summarize results from sequential runs
      const extractionRunCount = websiteRuns.length + (savedCompetitors.length * 2) + 1; // website + social + ads + viral
      const websiteSuccess = websiteRuns.filter((r) => r.ok).length;
      const successCount = websiteSuccess + (viralRun.ok ? 1 : 0);
      const failCount = extractionRunCount - successCount;

      metadata.set('step', 'Extracao concluida. Gerando sintese e recomendacoes...');
      metadata.set('progress', 90);
      metadata.set('extractionSummary', { success: successCount, failed: failCount, total: extractionRunCount });

      // Step 12: AI Synthesis & Creative Modeling (per D-25, D-26)
      let synthesisStatus = 'skipped';
      try {
        const synthesisResult = await synthesizeTask.triggerAndWait({
          analysisId: payload.analysisId,
          niche: payload.niche,
          segment: payload.segment,
          region: payload.region,
          mode: payload.mode,
        });

        synthesisStatus = synthesisResult.ok ? synthesisResult.output.status : 'unavailable';
      } catch {
        synthesisStatus = 'unavailable';
      }

      // Per D-27: mark completed regardless of synthesis status
      metadata.set('synthesisStatus', synthesisStatus);
      await updateAnalysis(payload.analysisId, { status: 'completed' });
      metadata.set('status', 'completed');
      metadata.set('progress', 100);

      return {
        analysisId: payload.analysisId,
        competitorsFound: savedCompetitors.length,
        extractionSuccess: successCount,
        extractionFailed: failCount,
        synthesisStatus,
      };
    } catch (error) {
      await updateAnalysis(payload.analysisId, { status: 'failed' }).catch(() => {});
      metadata.set('status', 'failed');
      metadata.set('error', (error as Error).message);
      throw error;
    }
  },
});
