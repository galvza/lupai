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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔍</text></svg>",
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
      </head>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
