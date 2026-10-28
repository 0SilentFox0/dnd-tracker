import type { Spell } from "@prisma/client";

import type { SpellRequestData } from "./cast-spell-schema";

import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { findParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { requireActor } from "@/lib/utils/battle/common/control";
import { runWithCritChoice } from "@/lib/utils/battle/crit-choice/run-with-crit-choice";
import type { CritResume } from "@/lib/utils/battle/crit-choice/types";
import { spellDiceRolls } from "@/lib/utils/battle/dice-record";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { castSpell } from "@/lib/utils/battle/spell";
import { flatEffects, isDamageEffect } from "@/lib/utils/battle/spell/cast/state";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { splitSaveRolls } from "@/lib/utils/battle/spell/save-rolls";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { toCastableSpell } from "@/lib/utils/battle/spell/to-castable";
import { spellZoneHazard } from "@/lib/utils/battle/spell/zone-hazard";
import { BattleAccessError, battleActionToEvent, BattleRuleError } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertCanAct } from "@/lib/utils/battle/turn";
import { assertSpellRolls } from "@/lib/utils/battle/validation/dice-checks";
import { rollDiceList } from "@/lib/utils/common/dice";

const healsByDefinition = (effects: Parameters<typeof flatEffects>[0]) => {
  const flat = flatEffects(effects);

  return flat.some((e) => e.kind === "heal" || e.kind === "hot") && !flat.some(isDamageEffect);
};

export interface SpellMutationDeps extends SummonDeps {
  loadSpell(spellId: string): Promise<Spell | null>;
}

const defaultDeps: SpellMutationDeps = {
  loadSpell: (id) => prisma.spell.findUnique({ where: { id } }),
  loadPool: getCachedSummonPool,
};

export function createSpellMutation(deps: SpellMutationDeps = defaultDeps) {
  return async (ctx: BattleMutationContext, data: SpellRequestData, resume?: CritResume): Promise<MutationResult> => {
    const order = ctx.participants;

    const caster = requireActor(ctx, data.casterId, {
      missing: "Кастера немає в бою",
      forbidden: "Заклинання може кастувати лише DM або контролер поточного ходу",
      inactive: { code: "participant_dead", message: "Кастер непритомний або мертвий" },
    });

    // вільний каст DM (швидкі дії): будь-яке закляття без слота; хід героя під керуванням DM — за правилами героя
    const free = ctx.isDM && data.free === true;

    if (!free && !caster.spellcasting.knownSpells.includes(data.spellId)) {
      throw new BattleRuleError("action_rejected", "Кастер не знає цього заклинання");
    }

    const spellRow = await deps.loadSpell(data.spellId);

    if (!spellRow || spellRow.campaignId !== ctx.scene.campaignId) throw new BattleAccessError(404, "Заклинання не знайдено");

    const spell = toCastableSpell(spellRow);

    const { definition } = spell;

    if (!data.preview) {
      assertCanAct(ctx, caster.basicInfo.id, { skipMorale: free });

      const isBonus = definition.cost === "bonusAction";

      // атака й закляття за дію ділять одну дію ходу; вільний каст DM її не витрачає
      if (!free && (isBonus ? caster.actionFlags.hasUsedBonusAction : caster.actionFlags.hasUsedAction)) {
        throw new BattleRuleError("action_used", isBonus ? API_ERRORS.BONUS_ACTION_USED : API_ERRORS.ACTION_USED);
      }
    }

    if (hasEffectMarker(caster, "disable_spell_casting")) {
      throw new BattleRuleError("action_rejected", "Кастер не може чаклувати");
    }

    const resolution = resolveSpellTargets(order, caster, spell, definition.targeting, data.targetIds, { map: ctx.meta.map, targetCell: data.targetCell });

    if (!resolution.ok) throw new BattleRuleError("invalid_target", resolution.error);

    const expected = casterSpellDice(caster, { dice: definition.dice, groupId: spell.groupId });

    // прев'ю без кидків: сервер кидає сам, щоб показати орієнтовний результат
    const diceRolls = data.preview && data.diceRolls.length === 0 ? rollDiceList(`${expected.count}d${expected.sides}`, ctx.rng ?? Math.random) : data.diceRolls;

    assertSpellRolls(expected, diceRolls);

    const { trusted, serverRolled } = splitSaveRolls(ctx, order, data.saveRolls);

    return runWithCritChoice(ctx, {
      action: "spell",
      actorId: data.casterId,
      request: data,
      enabled: ctx.meta.critChoiceByDm && !data.preview,
      resume,
      run: async ({ rng, crit }) => {
        const result = castSpell({
          caster,
          spell,
          targetIds: resolution.targetIds,
          allParticipants: order,
          currentRound: ctx.scene.round,
          battleId: ctx.scene.id,
          diceRolls,
          saveRolls: trusted,
          isDMCast: free,
          rng,
          crit,
          map: ctx.meta.map,
        });

        if (!result.success) throw new BattleRuleError("action_rejected", "Немає вільного слота для цього заклинання");

        const groups = spellDiceRolls({
          casterId: caster.basicInfo.id,
          sides: expected.sides,
          rolls: diceRolls,
          heal: healsByDefinition(definition.effects),
          saves: result.battleAction.actionDetails.savingThrows ?? [],
          presetSaveIds: new Set(trusted.map((s) => s.participantId)),
        });

        if (groups.length > 0) result.battleAction.actionDetails.diceRolls = groups;

        if (resolution.centre) result.battleAction.actionDetails.aimCell = resolution.centre;

        if (serverRolled.length > 0) {
          result.battleAction.resultText = [result.battleAction.resultText, `🎲 рятівні кидки кинув сервер: ${serverRolled.map((id) => findParticipant(order, id)?.basicInfo.name ?? id).join(", ")}`].join(" | ");
        }

        if (data.preview) {
          return {
            participants: order,
            pending: ctx.pending,
            events: [],
            response: { preview: true, battleAction: { ...result.battleAction, stateBefore: undefined }, ...(resolution.cells && { cells: resolution.cells }) },
          };
        }

        const summoned = await applyAbilitySummons(result.summons, result.allParticipantsUpdated, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng, deps });

        const action = summoned.messages.length > 0 ? { ...result.battleAction, resultText: [result.battleAction.resultText, ...summoned.messages].join(" | ") } : result.battleAction;

        const hazard = spellZoneHazard({ map: ctx.meta.map, spell, cells: resolution.cells, round: ctx.scene.round, spellDamage: result.spellDamage });

        return { participants: summoned.order, pending: ctx.pending, events: [battleActionToEvent(action)], ...(hazard && { scene: { map: hazard } }) };
      },
    });
  };
}
