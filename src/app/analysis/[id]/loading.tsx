/** Loading state para a página de análise */
export default function AnalysisLoading() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#C8FF3C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[13px] text-[#666]">Carregando análise...</p>
      </div>
    </div>
  );
}
