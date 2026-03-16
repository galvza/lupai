import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://calmai.pages.dev"),
  title: "O Custo de Vida do Brasileiro — 20 anos em dados",
  description:
    "12 indicadores econômicos brasileiros de 2005 a 2025. Dados oficiais do BCB, DIEESE, ANP, IBGE e FIPE. Interativo e open source.",
  openGraph: {
    title: "Em 20 anos, seu dinheiro perdeu metade do valor",
    description:
      "12 indicadores econômicos brasileiros de 2005 a 2025. Dados oficiais do BCB, DIEESE, ANP, IBGE e FIPE. Interativo e open source.",
    images: ["/og-image.png"],
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Em 20 anos, seu dinheiro perdeu metade do valor",
    description:
      "12 indicadores econômicos brasileiros de 2005 a 2025. Dados oficiais do BCB, DIEESE, ANP, IBGE e FIPE. Interativo e open source.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📊</text></svg>",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "O Custo de Vida do Brasileiro",
  description:
    "Dashboard interativo com 12 indicadores econômicos brasileiros de 2005 a 2025",
  url: "https://calmai.pages.dev",
  author: { "@type": "Person", name: "Bruno Reis" },
  inLanguage: "pt-BR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <noscript>
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Este dashboard precisa de JavaScript pra funcionar. Habilite o
            JavaScript no seu navegador.
          </p>
        </noscript>
      </body>
    </html>
  );
}
