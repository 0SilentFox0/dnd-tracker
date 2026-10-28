import type { SlotOption } from "./spell-flow-types";

import { spellLevelRoman } from "@/lib/constants/spells";
import { isFiveE } from "@/lib/utils/battle/attack/ability";
import { resolveChosenSlot, spellNeedsSlot, spellSlotKey, spellSlotLeft } from "@/lib/utils/battle/spell/slot";
import { PACT_KEY, slotRestoreOrder } from "@/lib/utils/spells/slot-keys";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export function slotOptions(caster: BattleParticipant | null, spellLevel: number): SlotOption[] {
  const slots = caster?.spellcasting?.spellSlots;

  if (!caster || !slots || !isFiveE(caster) || spellLevel < 1) return [];

  return slotRestoreOrder(slots).flatMap((key) => {
    const chosen = resolveChosenSlot(caster, spellLevel, key);

    const left = slots[key]?.current ?? 0;

    if (!chosen.ok || left <= 0) return [];

    const { castLevel } = chosen;

    return [{ key, castLevel, left, label: key === PACT_KEY ? `Пакт · коло ${castLevel}` : `Коло ${castLevel}` }];
  });
}

/** Скільки разів ще можна кастувати коло; кантрипи та вільний каст DM безлімітні. */
export function spellSlotsLeft(caster: BattleParticipant | null, level: number, free: boolean): number {
  return !spellNeedsSlot(level) || !caster || free ? Infinity : spellSlotLeft(caster, level);
}

export const casterUsesUniversalSlot = (caster: BattleParticipant | null): boolean => !!caster && spellSlotKey(caster, 1) === "universal";

export const spellBlockedBySlots = (caster: BattleParticipant | null, level: number, free: boolean): boolean =>
  !!caster && isFiveE(caster) && !casterUsesUniversalSlot(caster) && !free && level > 0 && slotOptions(caster, level).length === 0;

export function spellSlotCostLabel(spell: BookSpell, opts: { free: boolean; universal: boolean; chosen?: string }): string | null {
  if (!spellNeedsSlot(spell.level)) return null;

  if (opts.free) return "Вільний каст DM — слот не витрачається.";

  if (opts.chosen) return `Витратить слот: ${opts.chosen}.`;

  return opts.universal ? "Витратить універсальний слот." : `Витратить слот ${spellLevelRoman(spell.level)} кола.`;
}
