/** Loading state para a página de histórico */
export default function HistoryLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[#0F0F0F]">
        <div className="px-6 pb-8 pt-20 max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-[#1A1A1A] rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-32 bg-[#1A1A1A] rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-[#F2F1ED] flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="bg-white rounded-xl h-20 animate-pulse" />
          <div className="bg-white rounded-xl h-20 animate-pulse" />
          <div className="bg-white rounded-xl h-20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
