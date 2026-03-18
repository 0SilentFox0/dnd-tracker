"use client";

export function BattlePageLoadingState({
  mode,
}: {
  mode: "loading" | "not-found";
}) {
  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xl font-black italic uppercase tracking-widest animate-pulse">
            Завантаження...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-black text-white">
      <p className="text-2xl font-black italic uppercase tracking-widest">
        Бій не знайдено
      </p>
    </div>
  );
}
