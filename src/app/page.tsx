import { HeroSection } from "@/components/home/HeroSection";
import { ComoFuncionaSection } from "@/components/home/ComoFuncionaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PraQuemSection } from "@/components/home/PraQuemSection";
import { CtaSection } from "@/components/home/CtaSection";
import { Footer } from "@/components/layout/Footer";
import { DarkToLightDivider, LightToDarkDivider } from "@/components/ui/SectionDivider";

/** Página inicial do LupAI */
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <DarkToLightDivider />
      <ComoFuncionaSection />
      <FeaturesSection />
      <PraQuemSection />
      <LightToDarkDivider />
      <CtaSection />
      <Footer />
    </main>
  );
}
