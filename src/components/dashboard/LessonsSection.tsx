import type { UICompetitor as Competitor } from "@/types/ui";

/** Seção "O que aprender" com borda verde (fundo escuro) */
export const LessonsSection = ({ competitor }: { competitor: Competitor }) => {
  if (!competitor.lessons) return null;

  return (
    <section className="bg-dark-bg px-6 py-10 rounded-t-[32px] md:rounded-t-[48px] relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#111] border-l-2 border-accent rounded-r-xl p-5">
          <h3 className="text-[13px] font-semibold text-accent mb-2">
            O que aprender com {competitor.name}
          </h3>
          <p className="text-[13px] text-[#CCC] leading-relaxed">
            {competitor.lessons}
          </p>
        </div>
      </div>
    </section>
  );
};
