export default function BattleLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xl font-black italic uppercase tracking-widest animate-pulse">
          Завантаження бою...
        </p>
      </div>
    </div>
  );
}
