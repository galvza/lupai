/** Dados extraidos do site do concorrente */
export interface WebsiteData {
  positioning: string | null;
  offer: string | null;
  pricing: string | null;
  metaTags: {
    title: string | null;
    description: string | null;
    keywords: string[];
  };
  businessIdentifiers?: {
    cnpj: string | null;
    emailDomain: string | null;
  };
}

/** Dados de SEO do concorrente */
export interface SeoData {
  estimatedAuthority: number | null;
  topKeywords: string[];
  estimatedTraffic: number | null;
  backlinks: number | null;
}

/** Dados de redes sociais do concorrente */
export interface SocialData {
  instagram: {
    followers: number | null;
    postingFrequency: string | null;
    engagementRate: number | null;
    topPosts: SocialPost[];
  } | null;
  tiktok: {
    followers: number | null;
    postingFrequency: string | null;
    engagementRate: number | null;
    topPosts: SocialPost[];
  } | null;
}

/** Post de rede social */
export interface SocialPost {
  url: string;
  caption: string | null;
  likes: number;
  comments: number;
  shares: number | null;
  postedAt: string | null;
}

/** Links de redes sociais extraidos de um site (per D-02, D-09) */
export interface SocialLinks {
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  youtube: string | null;
  linkedin: string | null;
  twitter: string | null;
}

/** Input de perfil social com fonte de descoberta (per D-18) */
export interface SocialProfileInput {
  username: string;
  source: 'website' | 'search_fallback' | 'ai_hint';
}

/** Resultado da extracao de website incluindo social links (per D-13) */
export interface ExtractWebsiteResult {
  competitorId: string;
  websiteData: WebsiteData | null;
  seoData: SeoData | null;
  socialLinks: SocialLinks;
  businessIdentifiers: { cnpj: string | null; emailDomain: string | null } | null;
  warnings: string[];
}

/** Resultado da extracao de redes sociais */
export interface ExtractSocialResult {
  competitorId: string;
  socialData: SocialData | null;
  warnings: string[];
}

/** Sub-task status padronizado (per D-36) */
export type ExtractionStatus = 'success' | 'partial' | 'fallback' | 'unavailable' | 'skipped';

/** Dados de anuncios Meta do concorrente */
export interface MetaAdsData {
  activeAdsCount: number;
  ads: MetaAd[];
}

/** Anuncio individual do Meta */
export interface MetaAd {
  adId: string;
  creativeUrl: string | null;
  copyText: string | null;
  format: string | null;
  startedAt: string | null;
  isActive: boolean;
}

/** Dados de Google Ads do concorrente */
export interface GoogleAdsData {
  hasSearchAds: boolean;
  paidKeywords: string[];
  estimatedBudget: string | null;
}

/** Dados do Google Meu Negocio do concorrente */
export interface GmbData {
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  phone: string | null;
  categories: string[];
}

/** Concorrente completo como retornado do banco */
export interface Competitor {
  id: string;
  analysisId: string;
  name: string;
  websiteUrl: string | null;
  websiteData: WebsiteData | null;
  seoData: SeoData | null;
  socialData: SocialData | null;
  metaAdsData: MetaAdsData | null;
  googleAdsData: GoogleAdsData | null;
  gmbData: GmbData | null;
  createdAt: string;
}

/** Input para criar um concorrente */
export interface CompetitorInput {
  analysisId: string;
  name: string;
  websiteUrl?: string | null;
}
