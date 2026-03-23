export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-6">
      <div className="flex gap-2">
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"></div>
      </div>
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
        Optovendas está carregando
      </p>
    </div>
  );
}
