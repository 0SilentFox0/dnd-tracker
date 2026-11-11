import { ACTION_SLOT } from "../slots";
import { armourSl } from "./armour";
import { wfrpLoreAttribute } from "./attribute";
import { channelBadge } from "./badge";
import { castTargetOf, isPrayerKind, prayTargetOf, wfrpCastTest } from "./cast-test";
import { channelTargetOf, wfrpChannel } from "./channel";
import { wfrpMiscast } from "./miscast";

import { textRef } from "@/lib/i18n/text-ref";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { RuleSystemMagic } from "@/lib/utils/rules/systems/types";
import type { BattleParticipant } from "@/types/battle";

const dropChannelled = (p: BattleParticipant): BattleParticipant => (p.battleData.channelledSl ? { ...p, battleData: { ...p.battleData, channelledSl: 0 } } : p);

const withoutMiscast = (details: SystemSlot): SystemSlot => {
  const slot = ACTION_SLOT.read(details);

  return slot?.cast ? ACTION_SLOT.write({ ...slot, cast: { ...slot.cast, miscast: null } }) : details;
};

export const WFRP_MAGIC: RuleSystemMagic = {
  slots: false,
  ingredients: "avertMiscast",
  avertMiscast: (cast, who) => (cast.miscast && cast.miscast !== "wrath" ? { ...cast, miscast: null, details: withoutMiscast(cast.details), lines: [...cast.lines, textRef("wfrpMagic.log.ingredientAverts", who)] } : cast),
  castTest: wfrpCastTest,
  castPreview: (caster, kind) => {
    const prayer = isPrayerKind(kind);

    return { target: prayer ? prayTargetOf(caster) : castTargetOf(caster), channelTarget: channelTargetOf(caster), channelled: prayer ? 0 : (caster.battleData.channelledSl ?? 0), armourSl: prayer ? 0 : armourSl(caster) };
  },
  channel: wfrpChannel,
  miscast: wfrpMiscast,
  attribute: wfrpLoreAttribute,
  badge: channelBadge,
  onDamaged: dropChannelled,
};
