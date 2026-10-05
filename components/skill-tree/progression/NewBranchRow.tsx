export function NewBranchRow({ count, onSelect }: { count: number; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-2 text-left">
      <span className="branch-frame new hud-sc text-2xl">?</span>
      <span className="text-sm italic text-[#b8ab95]">Нова гілка — одна з {count} доступних</span>
    </button>
  );
}
