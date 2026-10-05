import { z } from "zod";

import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import type { BattleParticipant } from "@/types/battle";

export const summonSchema = z.object({
  name: z.string().min(1),
  side: z.enum(["ally", "enemy"]),
  maxHp: z.number().int().min(1),
  armorClass: z.number().int().min(0).default(10),
  initiative: z.number().int().default(10),
  /** ID заклинача (BattleParticipant) для логу */
  casterId: z.string().optional(),
  casterName: z.string().optional(),
});

export type SummonBody = z.infer<typeof summonSchema>;

export function addSummonMutation(ctx: BattleMutationContext, data: SummonBody): MutationResult {
  const battleId = ctx.scene.id;

  const side = data.side === "ally" ? ParticipantSide.ALLY : ParticipantSide.ENEMY;

  const summonId = `summon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const summoned: BattleParticipant = {
      basicInfo: {
        id: summonId,
        battleId,
        sourceId: summonId,
        sourceType: "unit",
        name: data.name,
        side,
        controlledBy: "dm",
      },
      abilities: {
        level: 1,
        initiative: data.initiative,
        baseInitiative: data.initiative,
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        modifiers: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
        proficiencyBonus: 2,
        race: "",
      },
      combatStats: {
        maxHp: data.maxHp,
        currentHp: data.maxHp,
        tempHp: 0,
        armorClass: data.armorClass,
        speed: 30,
        morale: 0,
        status: "active",
        minTargets: 1,
        maxTargets: 1,
      },
      spellcasting: {
        spellcastingClass: undefined,
        spellcastingAbility: undefined,
        spellSaveDC: undefined,
        spellAttackBonus: undefined,
        spellSlots: { universal: { max: 3, current: 3 } },
        knownSpells: [],
      },
      battleData: {
        attacks: [],
        activeEffects: [],
        equippedArtifacts: [],
        resolvedAbilities: [],
        spellEnhancers: [],
      },
      actionFlags: {
        hasUsedAction: false,
        hasUsedBonusAction: false,
        hasUsedReaction: false,
        hasExtraTurn: false,
      },
    };

  return {
    participants: ctx.participants,
    pending: [...ctx.pending, summoned],
    events: [
      {
        type: "ability",
        round: ctx.scene.round,
        actorId: data.casterId || "dm",
        targets: [{ participantId: summoned.basicInfo.id, participantName: summoned.basicInfo.name }],
        resultText: `Призовано істоту: ${data.name} (з’явиться на початку наступного раунду)`,
        details: { actorName: data.casterName || "Хтось", actorSide: "ally", actionDetails: {} },
      },
    ],
  };
}
