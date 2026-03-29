import { Nav } from "@/components/layout/Nav";
import { HeroSection } from "@/components/home/HeroSection";
import { Marquee } from "@/components/home/Marquee";
import { ComoFuncionaSection } from "@/components/home/ComoFuncionaSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { PraQuemSection } from "@/components/home/PraQuemSection";
import { CtaSection } from "@/components/home/CtaSection";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

/** Página inicial do LupAI */
export default function HomePage() {
  return (
    <main>
      <Nav />
      <HeroSection />
      <Marquee />
      <div className="w-full h-px bg-[#E0DDD5]" />
      <ComoFuncionaSection />
      <FeaturesSection />
      <PraQuemSection />
      <CtaSection />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
