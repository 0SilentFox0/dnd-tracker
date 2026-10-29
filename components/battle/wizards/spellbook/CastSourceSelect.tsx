import { useTranslations } from "next-intl";

import { BATTLE_SELECT_CLASS } from "@/lib/constants/battle";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";

type Book = ReturnType<typeof useSpellBook>;

export function CastSourceSelect({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell.source");

  const text = useText();

  const { options, value } = { options: book.view.sourceOptions, value: book.view.sourceValue };

  if (options.length === 0) return null;

  return (
    <div className="mb-3 space-y-2 text-sm">
      <label className="flex items-center justify-between gap-3">
        {tw("label")}
        <select aria-label={tw("label")} value={value} onChange={(e) => book.actions.setSource(e.target.value)} className={BATTLE_SELECT_CLASS}>
          <option value="" disabled>{tw("pick")}</option>
          {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{text(option.label)}</option>)}
        </select>
      </label>
      {book.view.castLevelOptions.length > 0 && <label className="flex items-center justify-between gap-3">
        {tw("level")}
        <select aria-label={tw("level")} value={book.view.castLevelValue ?? ""} onChange={(e) => book.actions.setCastLevel(Number(e.target.value))} className={BATTLE_SELECT_CLASS}>
          {book.view.castLevelOptions.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{text(option.label)}</option>)}
        </select>
      </label>}
    </div>
  );
}
