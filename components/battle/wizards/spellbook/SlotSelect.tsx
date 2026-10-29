import { useTranslations } from "next-intl";

import { BATTLE_SELECT_CLASS } from "@/lib/constants/battle";
import type { useSpellBook } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";

type Book = ReturnType<typeof useSpellBook>;

export function SlotSelect({ book }: { book: Book }) {
  const tw = useTranslations("battleWizards.spell");

  const text = useText();

  const { options, value } = book.view.slot;

  if (options.length === 0) return null;

  return (
    <label className="mb-3 flex items-center justify-between gap-3 text-sm">
      {tw("slot")}
      <select aria-label={tw("slot")} value={value ?? options[0].key} onChange={(e) => book.actions.setSlot(e.target.value)} className={BATTLE_SELECT_CLASS}>
        {options.map((o) => <option key={o.key} value={o.key}>{text(o.label)}</option>)}
      </select>
    </label>
  );
}
