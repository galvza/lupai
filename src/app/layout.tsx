import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LupAI — Inteligência competitiva com IA",
  description:
    "Descreva seu nicho e receba análise competitiva, conteúdos virais e recomendações estratégicas — em minutos.",
  openGraph: {
    title: "LupAI — Inteligência competitiva com IA",
    description:
      "Descreva seu nicho e receba análise competitiva, conteúdos virais e recomendações estratégicas — em minutos.",
    type: "website",
    locale: "pt_BR",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Poppins:wght@800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "LupAI",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Plataforma de inteligência competitiva com IA. Descubra concorrentes, analise SEO, monitore anúncios, transcreva vídeos virais e receba recomendações estratégicas para dominar seu nicho de marketing.",
              "url": "https://lupai.gsdigitais.com",
              "author": {
                "@type": "Person",
                "name": "Gabriel Alves de Souza",
                "url": "https://linkedin.com/in/biel-als/"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL",
                "description": "Gratuito para começar"
              },
              "featureList": [
                "Descoberta automática de concorrentes",
                "Análise de SEO competitivo",
                "Monitoramento de anúncios (Meta Ads, Google Ads)",
                "Detecção de conteúdo viral (TikTok, Instagram Reels)",
                "Transcrição e análise de padrões de vídeos",
                "Recomendações estratégicas com IA",
                "Geração de roteiros de criativos"
              ],
              "inLanguage": "pt-BR"
            })
          }}
        />
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
