import { HeroSection } from "@/components/home/HeroSection";
import { ComoFuncionaSection } from "@/components/home/ComoFuncionaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PraQuemSection } from "@/components/home/PraQuemSection";
import { CtaSection } from "@/components/home/CtaSection";
import { Footer } from "@/components/layout/Footer";

/** Página inicial do LupAI */
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <ComoFuncionaSection />
      <FeaturesSection />
      <PraQuemSection />
      <CtaSection />
      <Footer />
    </main>
  );
}
