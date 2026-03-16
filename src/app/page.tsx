import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/layout/Section";
import HookCard from "@/components/cards/HookCard";
import KpiRow from "@/components/cards/KpiRow";
import ComparisonStrip from "@/components/cards/ComparisonStrip";
import SalaryNarrative from "@/components/cards/SalaryNarrative";
import NarrativeText from "@/components/cards/NarrativeText";
import Timeline from "@/components/cards/Timeline";
import PullQuote from "@/components/cards/PullQuote";
import InsightGrid from "@/components/cards/InsightGrid";
import HousingInsightCards from "@/components/cards/HousingInsightCards";
import CtaBox from "@/components/cards/CtaBox";
import ChartSection from "@/components/charts/ChartSection";
import CorrelationChart from "@/components/charts/CorrelationChart";
import RentCorrelationChart from "@/components/charts/RentCorrelationChart";
import DebtCycleChart from "@/components/charts/DebtCycleChart";

export default function Home() {
  return (
    <main className="max-w-[720px] mx-auto px-4 md:px-6">
      <Header />
      <HookCard />
      <KpiRow />

      <Section chapterNumber={1} title="A fotografia — de lá pra cá">
        <ComparisonStrip indicator="salarioMinimo" label="Salário mínimo" />
        <div className="mt-6">
          <SalaryNarrative />
        </div>
      </Section>

      <Section title="Evolução dos indicadores — 20 anos em uma tela">
        <ChartSection />
      </Section>

      <Section chapterNumber={2} title="O filme — os momentos que mudaram tudo">
        <NarrativeText>
          <p>
            Economia não anda em linha reta. Ela dá saltos, tropeça, às vezes
            despenca de um penhasco. Nos últimos 20 anos, o Brasil passou por
            pelo menos uma dúzia de momentos que redefiniram os indicadores de
            uma hora pra outra. Alguns você lembra — pandemia, impeachment.
            Outros passaram batido, mas mexeram no seu bolso do mesmo jeito.
            Estes são os marcos. Presta atenção nas datas e cruza com o gráfico
            lá em cima.
          </p>
        </NarrativeText>
        <div className="mt-8">
          <Timeline />
        </div>
      </Section>

      <Section chapterNumber={3} title="O que o IPCA não conta">
        <NarrativeText>
          <p>
            A inflação oficial mede uma cesta de produtos. Mas qualquer
            brasileiro sabe que tem coisa que subiu muito mais que a média. O
            aluguel em São Paulo, por exemplo — o FipeZAP mostra que o m² de
            locação disparou bem acima do IPCA. A conta de luz? Teve ano (2015,
            2021) que a bandeira vermelha sozinha adicionava 30% na fatura.
            Esses são os custos que o IPCA dilui na média — mas que pesam no
            bolso de quem paga.
          </p>
        </NarrativeText>

        <div className="mt-10">
          <RentCorrelationChart />
        </div>

        <div className="mt-10">
          <HousingInsightCards />
        </div>
      </Section>

      <Section chapterNumber={4} title="O que os números revelam">
        <PullQuote />

        <div className="mt-10">
          <CorrelationChart />
        </div>

        <div className="mt-10">
          <DebtCycleChart />
        </div>
      </Section>

      <Section title="O que os dados contam">
        <InsightGrid />
      </Section>

      <CtaBox />
      <Footer />
    </main>
  );
}
