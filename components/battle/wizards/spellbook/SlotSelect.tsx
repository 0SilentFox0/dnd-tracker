import type { useSpellBook } from "@/lib/hooks/battle";

type Book = ReturnType<typeof useSpellBook>;

export function SlotSelect({ book }: { book: Book }) {
  const { options, value } = book.view.slot;

  if (options.length === 0) return null;

  return (
    <label className="mb-3 flex items-center justify-between gap-3 text-sm">
      Слот
      <select aria-label="Слот" value={value ?? options[0].key} onChange={(e) => book.actions.setSlot(e.target.value)} className="h-10 min-w-40 border border-white/20 bg-black/30 px-2 text-[var(--ink)]">
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}
