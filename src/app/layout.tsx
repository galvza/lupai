import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LupAI - Inteligencia de Marketing com IA',
  description: 'Analise completa do mercado e nicho com IA',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
};

export default RootLayout;
