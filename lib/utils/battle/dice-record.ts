import { diceSlots } from "@/lib/utils/common/dice";
import type { DiceRollGroup, DieSides, RolledDie } from "@/types/battle";

const SIDES = new Set<number>([4, 6, 8, 10, 12, 20]);

const isSides = (n: number): n is DieSides => SIDES.has(n);

export function attackDiceRolls(input: { attackerId: string; targetId: string; d20: number; second?: { value: number; serverRolled: boolean }; chosenD20?: number; damage: number[]; damageFormula: string }): DiceRollGroup[] {
  const { attackerId: rollerId, targetId, second } = input;

  const firstChosen = !!second && input.chosenD20 === input.d20;

  const d20s: RolledDie[] = [{ sides: 20, value: input.d20, ...(firstChosen && { chosen: true }) }];

  if (second) d20s.push({ sides: 20, value: second.value, ...(!firstChosen && { chosen: true }), ...(second.serverRolled && { server: true }) });

  const slots = diceSlots(input.damageFormula);

  const damage = input.damage.flatMap((value, i): RolledDie[] => {
    const sides = slots[i];

    return sides !== undefined && isSides(sides) ? [{ sides, value }] : [];
  });

  return [{ kind: "attack", rollerId, targetId, dice: d20s }, ...(damage.length > 0 ? [{ kind: "damage" as const, rollerId, targetId, dice: damage }] : [])];
}

export function spellDiceRolls(input: { casterId: string; sides: number; rolls: number[]; heal: boolean; saves: Array<{ participantId: string; roll: number }>; presetSaveIds: ReadonlySet<string> }): DiceRollGroup[] {
  const { sides } = input;

  const power: DiceRollGroup[] = isSides(sides) && input.rolls.length > 0 ? [{ kind: input.heal ? "heal" : "damage", rollerId: input.casterId, dice: input.rolls.map((value) => ({ sides, value })) }] : [];

  const saves = input.saves.map((s): DiceRollGroup => ({ kind: "save", rollerId: s.participantId, dice: [{ sides: 20, value: s.roll, ...(!input.presetSaveIds.has(s.participantId) && { server: true }) }] }));

  return [...power, ...saves];
}

export function moraleDiceRolls(participantId: string, d10: number): DiceRollGroup[] {
  return [{ kind: "morale", rollerId: participantId, dice: [{ sides: 10, value: d10 }] }];
}
