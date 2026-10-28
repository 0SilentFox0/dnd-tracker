import { BATTLE_SELECT_CLASS } from "@/lib/constants/battle";
import type { useSpellBook } from "@/lib/hooks/battle";

type Book = ReturnType<typeof useSpellBook>;

export function CastSourceSelect({ book }: { book: Book }) {
  const { options, value } = { options: book.view.sourceOptions, value: book.view.sourceValue };

  if (options.length === 0) return null;

  return (
    <div className="mb-3 space-y-2 text-sm">
      <label className="flex items-center justify-between gap-3">
        Джерело каста
        <select aria-label="Джерело каста" value={value} onChange={(e) => book.actions.setSource(e.target.value)} className={BATTLE_SELECT_CLASS}>
          <option value="" disabled>Оберіть джерело</option>
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
      </label>
      {book.view.castLevelOptions.length > 0 && <label className="flex items-center justify-between gap-3">
        Рівень каста
        <select aria-label="Рівень каста" value={book.view.castLevelValue ?? ""} onChange={(e) => book.actions.setCastLevel(Number(e.target.value))} className={BATTLE_SELECT_CLASS}>
          {book.view.castLevelOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
        </select>
      </label>}
    </div>
  );
}
