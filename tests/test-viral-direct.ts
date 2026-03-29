import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
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
} catch {}

import { searchViralTiktok, deriveKeywords, deriveHashtags } from '../src/lib/apify/tiktok-viral';
import { searchViralInstagram } from '../src/lib/apify/instagram-viral';

const niche = 'barbearia';
const segment = 'barbearia premium';

console.log('Keywords:', deriveKeywords(niche, segment));
console.log('Hashtags:', deriveHashtags(niche, segment));

async function test() {
  console.log('\n--- Testing TikTok ---');
  try {
    const tt = await searchViralTiktok(niche, segment);
    console.log('TikTok results:', tt.length);
    tt.forEach((v, i) => console.log(`  ${i}: ${v.platform} ${v.engagement.views} views ${v.videoUrl?.substring(0, 80)}`));
  } catch (e) {
    console.error('TikTok error:', (e as Error).message);
  }

  console.log('\n--- Testing Instagram ---');
  try {
    const ig = await searchViralInstagram(niche, segment);
    console.log('Instagram results:', ig.length);
    ig.forEach((v, i) => console.log(`  ${i}: ${v.platform} ${v.engagement.views} views ${v.videoUrl?.substring(0, 80)}`));
  } catch (e) {
    console.error('Instagram error:', (e as Error).message);
  }
}

test();
