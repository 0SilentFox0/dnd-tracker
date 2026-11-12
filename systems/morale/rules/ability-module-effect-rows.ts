import { textRef } from "@/lib/i18n/text-ref";
import { clampMorale, moraleCapOf } from "@/lib/utils/abilities/engine/effects/morale";
import { each, immuneTo } from "@/lib/utils/abilities/registry/effects/each";
import type { SystemEffectRowInput } from "@/lib/utils/abilities/registry/effects/system-row";
import type { EffectApplyInput } from "@/lib/utils/abilities/registry/effects/types";
import { TARGET_FIELD } from "@/lib/utils/abilities/registry/fields";
import type { Effect } from "@/lib/utils/abilities/schema";
import { seg } from "@/lib/utils/abilities/segments";
import { signed } from "@/lib/utils/common/format";

type ChangeMorale = Extract<Effect, { kind: "changeMorale" }>;

function applyChangeMorale(input: EffectApplyInput<ChangeMorale>) {
  const { ability, effect } = input;

  return each(
    input,
    (p) => {
      const morale = clampMorale(p.combatStats.morale + effect.delta, moraleCapOf(p));

      return morale === p.combatStats.morale ? null : { ...p, combatStats: { ...p.combatStats, morale } };
    },
    (names) => textRef("abilityText.log.morale", { ability: ability.name, target: names, delta: signed(effect.delta) }),
    (p) => effect.delta < 0 && immuneTo(input.participants, p.basicInfo.id, "fear"),
  );
}

const changeMorale = {
  kind: "changeMorale",
  row: {
    kind: "changeMorale",
    static: false,
    fields: [{ name: "delta", input: "number" }, TARGET_FIELD],
    describe: (e: ChangeMorale) => [seg("summary.effects.changeMorale", { delta: signed(e.delta) })],
    apply: applyChangeMorale,
  },
  defaults: { delta: 1 },
} as const;

export const MORALE_MODULE_EFFECT_ROWS = [changeMorale] as const satisfies readonly SystemEffectRowInput[];
