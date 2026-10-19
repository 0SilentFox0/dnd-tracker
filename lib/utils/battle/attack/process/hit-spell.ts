import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { AttackKind } from "@/lib/utils/abilities/schema";
import { castSpell } from "@/lib/utils/battle/spell";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { rollDiceList } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export interface HitSpellInput {
  attacker: BattleParticipant;
  targetId: string;
  participants: BattleParticipant[];
  spells: ReadonlyMap<string, CastableSpell>;
  round: number;
  battleId: string;
  attackKind?: AttackKind;
  rng: () => number;
}

export function castHitSpell(input: HitSpellInput): { participants: BattleParticipant[]; messages: string[] } {
  const { attacker, targetId, participants, rng } = input;

  const ids = findFlags(withSelf(participants, attacker), attacker.basicInfo.id, "castSpellOnHit")
    .filter((f) => !f.attackKind || f.attackKind === input.attackKind)
    .flatMap((f) => f.spellIds);

  const spell = ids.length > 0 ? input.spells.get(ids[Math.floor(rng() * ids.length)]) : undefined;

  const target = findParticipant(participants, targetId);

  if (!spell || !target) return { participants, messages: [] };

  const dice = casterSpellDice(attacker, { dice: spell.definition.dice, groupId: spell.groupId });

  const diceRolls = dice.count > 0 ? rollDiceList(`${dice.count}d${dice.sides}`, rng) : [];

  const result = castSpell({ caster: attacker, spell, targetIds: [targetId], allParticipants: participants, currentRound: input.round, battleId: input.battleId, diceRolls, rng, isDMCast: true });

  const details = result.battleAction.resultText.split(" | ").slice(1);

  return { participants: result.allParticipantsUpdated, messages: [`🌑 ${attacker.basicInfo.name}: ${spell.name} → ${target.basicInfo.name}`, ...details] };
}
