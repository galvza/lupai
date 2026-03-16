/**
 * Timeline vertical de marcos econômicos com expand/collapse.
 *
 * Mostra 5 eventos inicialmente com botão "Ver todos os marcos".
 * Linha vertical cinza com dots coloridos por tipo (crise/crescimento).
 */

"use client";

import { useState } from "react";

type TimelineEvent = {
  date: string;
  type: "growth" | "crisis";
  title: string;
  body: string;
  badges: string[];
};

const EVENTS: TimelineEvent[] = [
  {
    date: "2005–2007",
    type: "growth",
    title: "O milagrinho brasileiro",
    body: "A China comprava tudo que o Brasil plantava e extraía. Soja, minério, petróleo — tudo voando. A Selic caiu de 19% pra 11%, o dólar recuou, o emprego cresceu. O país surfava uma onda que parecia não ter fim. Parecia.",
    badges: ["Selic: 19% → 11%", "Dólar: R$ 2,69 → R$ 1,77"],
  },
  {
    date: "Abril 2008",
    type: "growth",
    title: "Brasil vira investment grade",
    body: "A S&P olhou pro Brasil e disse: 'confiamos'. Em 30 de abril, o país ganhou grau de investimento pela primeira vez. A Fitch veio logo depois. O dólar bateu R$ 1,59 — menor valor em anos.",
    badges: ["Dólar mínimo: R$ 1,59", "Rating: BBB- (S&P, abr/2008)"],
  },
  {
    date: "Setembro 2008",
    type: "crisis",
    title: "O mundo quebra",
    body: "Lehman Brothers faliu e levou o planeta junto. O dólar saltou de R$ 1,60 pra R$ 2,39 em três meses. O Banco Central reagiu rápido — derrubou a Selic de 13,75% pra 8,75% em dez meses. O Brasil se safou melhor que a maioria, mas o susto foi real.",
    badges: ["Dólar: R$ 1,60 → R$ 2,39", "Selic: 13,75% → 8,75%"],
  },
  {
    date: "2010",
    type: "growth",
    title: "O ano dourado",
    body: "PIB cresceu 7,5% — o melhor resultado desde 1986. Lula saiu do governo com 87% de aprovação. Mais de 40 milhões de brasileiros tinham subido de classe social na década anterior. O país se sentia invencível. Spoiler: não era.",
    badges: ["PIB: +7,5%", "Aprovação: 87%"],
  },
  {
    date: "2011–2013",
    type: "crisis",
    title: "A aposta que deu errado",
    body: "O governo Dilma fez uma aposta: derrubou a Selic pra 7,25% — menor da história até então — e distribuiu isenção fiscal pra tentar turbinar o crescimento. A inflação não explodiu de cara — ficou na casa dos 6%, cutucando o teto da meta — mas o estrago foi de outro tipo. O mercado perdeu a confiança na política econômica. A indústria, que já apanhava da concorrência chinesa, encolheu. E os investidores começaram a se perguntar: quem tá no controle?",
    badges: ["Selic mínima: 7,25%", "IPCA: ~6% (teto da meta)"],
  },
  {
    date: "2014",
    type: "crisis",
    title: "O chão some",
    body: "Duas bombas de origens diferentes que explodiram ao mesmo tempo. De fora: o mundo parou de comprar commodity — o minério de ferro caiu de US$ 187 pra US$ 40 a tonelada, e o petróleo derreteu junto. De dentro: a Lava Jato paralisou a Petrobras, que sozinha respondia por quase 9% do investimento do país. Uma crise alimentou a outra. Sem receita de exportação E sem motor de investimento, a economia ficou sem chão. Literalmente.",
    badges: ["Minério: US$ 187 → US$ 40", "Petrobras: ~9% do investimento"],
  },
  {
    date: "2015–2016",
    type: "crisis",
    title: "A tempestade perfeita",
    body: "Não tem como amenizar: foi o pior biênio da economia brasileira em décadas. O IPCA bateu 10,67%. A Selic subiu pra 14,25%. O PIB encolheu 3,5% em 2015 e 3,3% em 2016. Veio o impeachment, a incerteza política, o câmbio descontrolado. Quem vivia de salário sentiu no supermercado. Quem tinha dívida sentiu no banco.",
    badges: ["IPCA: 10,67%", "PIB: -3,5% (2015) e -3,3% (2016)", "Selic: 14,25%"],
  },
  {
    date: "2017–2019",
    type: "growth",
    title: "Respirando por aparelhos",
    body: "A economia parou de cair, mas não dá pra chamar de recuperação. Crescimento de 1% ao ano — aquele tipo de melhora que você não sente no bolso. Temer aprovou o teto de gastos. Bolsonaro chegou, a Selic caiu pra 4,5% e a reforma da previdência passou. Os números melhoravam devagar, como quem tá se levantando depois de um nocaute.",
    badges: ["PIB: ~1% a.a.", "Selic: 13% → 4,5%"],
  },
  {
    date: "Março 2020",
    type: "crisis",
    title: "O mundo para",
    body: "COVID-19. A Selic caiu de 3,75% em março até 2% em agosto — o menor nível da história. O dólar explodiu pra R$ 5,64 na média de maio. A gasolina caiu 17% porque ninguém andava de carro. Mas os preços dos alimentos? Esses subiram — e como subiram. O arroz virou meme, mas a fome não tinha graça nenhuma.",
    badges: ["Selic: 3,75% → 2,00%", "Dólar: pico R$ 5,64", "Gasolina: -17%"],
  },
  {
    date: "Meados de 2021",
    type: "crisis",
    title: "A torneira seca",
    body: "Como se a pandemia não bastasse, o Brasil enfrentou a pior crise hídrica em 91 anos. Os reservatórios das hidrelétricas secaram e o governo acionou a bandeira vermelha 2 — a mais cara. A conta de luz explodiu. Isso pressionou a inflação num momento que ela já tava subindo por causa da reabertura da economia. Foi gasolina no incêndio. Literalmente.",
    badges: ["Bandeira vermelha 2", "Reservatórios: menor nível em 91 anos"],
  },
  {
    date: "2021–2022",
    type: "crisis",
    title: "A ressaca da pandemia",
    body: "O mundo reabriu e os preços explodiram. Inflação global, guerra na Ucrânia, cadeias de suprimento quebradas. No Brasil, o IPCA voltou a dois dígitos. O Banco Central não teve escolha: subiu a Selic 12 vezes seguidas até 13,75%. Gasolina bateu recorde. A conta do 'fique em casa' chegou — com juros.",
    badges: ["IPCA: 10,06% (2021)", "Selic: 2% → 13,75%"],
  },
  {
    date: "2023–2024",
    type: "growth",
    title: "Calmaria com ressalvas",
    body: "Aqui fica estranho. A inflação cedeu — IPCA voltou pra perto de 4,5%. Até aí, ok. Mas o PIB cresceu 3,4% em 2024 com a Selic em 13,75%. Isso não deveria acontecer. Juro alto normalmente trava a economia. O que segurou? Agronegócio em safra recorde e mercado de trabalho aquecido — o desemprego caiu pro menor nível desde 2014. Parece boa notícia, e em parte é. Mas debaixo do capô, o endividamento das famílias bateu recorde. Quase metade da renda do brasileiro vai pra pagar dívida. A economia cresceu, mas o brasileiro tá pagando esse crescimento no cartão.",
    badges: ["IPCA: ~4,5%", "PIB: +3,4% (2024)", "Endividamento: recorde"],
  },
  {
    date: "2025",
    type: "crisis",
    title: "De volta aos juros altos",
    body: "A Selic chegou a 15% — o maior patamar em quase duas décadas. O dólar abriu o ano acima de R$ 6, assustou todo mundo, mas recuou pra perto de R$ 5,50. A economia desacelerou. O mercado debate se estamos entrando num novo ciclo recessivo ou se é só o freio do Banco Central fazendo efeito. Enquanto isso, o brasileiro faz as contas no mercado e suspira.",
    badges: ["Selic: 15%", "Dólar: R$ 6+ → ~R$ 5,50"],
  },
];

const INITIAL_VISIBLE = 5;

/** Timeline vertical dos marcos econômicos com expand/collapse. */
const Timeline = () => {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? EVENTS : EVENTS.slice(0, INITIAL_VISIBLE);

  return (
    <div>
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "5px",
            top: 0,
            bottom: 0,
            width: "2px",
            background: "var(--border)",
          }}
        />
        <div
          style={{ display: "flex", flexDirection: "column" }}
        >
          {visibleEvents.map((event, i) => {
            const dotColor =
              event.type === "crisis"
                ? "var(--accent-red)"
                : "var(--accent-green)";
            return (
              <div
                key={i}
                className="pl-7 sm:pl-9 py-3 sm:py-4"
                style={{ position: "relative" }}
              >
                {/* Colored dot */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "16px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: dotColor,
                    border: "2px solid white",
                  }}
                />
                <p
                  className="font-ui"
                  style={{
                    fontSize: "var(--fs-label)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: dotColor,
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  {event.date}
                </p>
                <p
                  className="text-[15px] sm:text-base"
                  style={{
                    fontWeight: 500,
                    marginBottom: "6px",
                    color: "var(--text-primary)",
                  }}
                >
                  {event.title}
                </p>
                <p
                  className="text-[13px] sm:text-sm"
                  style={{
                    lineHeight: 1.65,
                    color: "var(--text-secondary)",
                    marginBottom: "10px",
                  }}
                >
                  {event.body}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {event.badges.map((badge) => (
                    <span
                      key={badge}
                      className="font-ui"
                      style={{
                        fontSize: "var(--fs-label)",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        border: `1px solid ${dotColor}30`,
                        background: `${dotColor}08`,
                        color: dotColor,
                        fontWeight: 500,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="font-ui"
          style={{
            display: "block",
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: "var(--fs-body-sm)",
          }}
        >
          Ver todos os marcos ↓
        </button>
      )}
    </div>
  );
};

export default Timeline;
