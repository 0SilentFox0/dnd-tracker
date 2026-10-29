import { getCachedSummonPool } from "@/lib/cache/reference-data";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { createSpellMutation, type SpellMutationDeps } from "@/lib/server/battles/mutations/spell/spell-mutation";
import { findParticipant, updateParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import { cooldownLeft, recordUse, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { evaluateCondition } from "@/lib/utils/abilities/registry/conditions";
import { lairAbilities, lairBlocker, spendLair } from "@/lib/utils/battle/actions/lair";
import { legendaryAttack } from "@/lib/utils/battle/actions/legendary";
import { legendaryAbilities, legendaryBlocker, legendaryCostOf, spendLegendary } from "@/lib/utils/battle/actions/legendary-options";
import type { LegendaryActionBody } from "@/lib/utils/battle/actions/schema";
import { currentOf } from "@/lib/utils/battle/common/control";
import { logFields } from "@/lib/utils/battle/log/lines";
import { abilityRunContext } from "@/lib/utils/battle/pipeline/ability-use";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, battleActionToEvent, BattleRuleError, ruleErrorOf, systemEvent } from "@/lib/utils/battle/store";
import { applyAbilitySummons, type SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { assertAbilityTargets } from "@/lib/utils/battle/validation/ability-targets";
import { abilityOnMap } from "@/lib/utils/battle/view";
import { rngOf } from "@/lib/utils/common/rng";
import type { BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const defaultDeps: SpellMutationDeps = { loadPool: getCachedSummonPool, loadSpell: (id) => prisma.spell.findUnique({ where: { id } }) };

function assertLegendaryAllowed(ctx: BattleMutationContext, actor: BattleParticipant, cost: number): void {
  const blocker = legendaryBlocker(actor, currentOf(ctx), cost);

  if (blocker) throw ruleErrorOf("action_rejected", blocker);
}

const counter = (p: BattleParticipant) => `${p.battleData.legendary?.actionsLeft ?? 0}/${p.battleData.legendary?.actions ?? 0}`;

export function createLegendaryMutation(deps: SummonDeps & Partial<Pick<SpellMutationDeps, "loadSpell">> = defaultDeps) {
  return async (ctx: BattleMutationContext, body: LegendaryActionBody): Promise<MutationResult> => {
    if (!ctx.isDM) throw new BattleAccessError(403, API_ERRORS.BATTLE_LEGENDARY_DM_ONLY);

    const actor = findParticipant(ctx.participants, body.participantId);

    if (!actor) throw new BattleAccessError(404, API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

    const { id, name } = actor.basicInfo;

    const { round } = ctx.scene;

    const { option } = body;

    if (option.kind === "attack") {
      assertLegendaryAllowed(ctx, actor, 1);

      const out = legendaryAttack({ participants: ctx.participants, actorId: id, attackIndex: option.attackIndex, targetId: option.targetId, map: ctx.meta.map, rules: ctx.meta.rules, round, rng: rngOf(ctx), battleId: ctx.scene.id });

      const participants = updateParticipant(out.participants, id, (p) => spendLegendary(p, 1));

      const after = findParticipant(participants, id) ?? actor;

      return { participants, pending: ctx.pending, events: [systemEvent(round, textRef("battleLog.legendary.action", { name, attack: out.attackName, counter: counter(after) })), battleActionToEvent(out.action)] };
    }

    const lair = option.kind === "lair";

    const ability = (lair ? lairAbilities(actor) : legendaryAbilities(actor)).find((a) => a.key === option.abilityKey);

    if (!ability) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_SUCH_LEGENDARY);

    const cost = legendaryCostOf(ability);

    if (lair) {
      const blocker = lairBlocker(actor, round, ability.key);

      if (blocker) throw ruleErrorOf("action_rejected", blocker);
    } else assertLegendaryAllowed(ctx, actor, cost);

    const spend = (p: BattleParticipant) => lair ? spendLair(p, round, ability.key) : spendLegendary(p, cost);

    if (!withinCountLimits(actor, ability)) throw new BattleRuleError("ability_limit", API_ERRORS.BATTLE_USES_EXHAUSTED);

    const wait = cooldownLeft(actor, ability, round);

    if (wait > 0) throw new BattleRuleError("ability_limit", API_ERRORS.ABILITY_COOLDOWN, { rounds: wait });

    if (ability.condition && !evaluateCondition(ability.condition, { owner: actor, event: { type: "action", actorId: id, abilityKey: ability.key, targetIds: option.targetIds ?? [] }, participants: ctx.participants, sourceId: ability.source.id })) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_ABILITY_CONDITION_UNMET);

    if (ability.perform?.kind === "spell") {
      if (!lair) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_LEGENDARY_VIA_SPELL_DIALOG);

      return createSpellMutation({ ...defaultDeps, ...deps }, { serverRolls: true })(ctx, { casterId: id, spellId: ability.perform.spellId, legendaryKey: ability.key, targetIds: option.targetIds ?? [], diceRolls: [] });
    }

    if (ability.perform?.kind === "attack") {
      const attackName = ability.perform.attack;

      const attackIndex = actor.battleData.attacks.findIndex((a) => a.name.toLocaleLowerCase() === attackName.toLocaleLowerCase());

      if (attackIndex < 0) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_LEGENDARY_ATTACK_NOT_FOUND);

      if (option.targetIds?.length !== 1) throw new BattleRuleError("invalid_target", API_ERRORS.BATTLE_LEGENDARY_ONE_TARGET);

      const out = legendaryAttack({ participants: ctx.participants, actorId: id, attackIndex, targetId: option.targetIds[0], map: ctx.meta.map, rules: ctx.meta.rules, round, rng: rngOf(ctx), battleId: ctx.scene.id });

      const participants = updateParticipant(out.participants, id, (p) => spend(recordUse(p, ability.key, round, ability.limits?.pool)));

      return { participants, pending: ctx.pending, events: [systemEvent(round, textRef(lair ? "battleLog.legendary.useLair" : "battleLog.legendary.use", { name, ability: ability.name, attack: out.attackName })), battleActionToEvent(out.action)] };
    }

    const targetIds = assertAbilityTargets(ability, ctx.participants, option.targetIds ?? [], { owner: actor, onMap: abilityOnMap(ctx.meta.map, actor) });

    const run = runAbilities(ctx.participants, { type: "action", actorId: id, abilityKey: ability.key, targetIds }, abilityRunContext(ctx));

    const summoned = await applyAbilitySummons(run.summons, run.participants, { campaignId: ctx.scene.campaignId, battleId: ctx.scene.id, rng: rngOf(ctx), rules: ctx.meta.rules, deps });

    const participants = updateParticipant(summoned.order, id, spend);

    const after = findParticipant(participants, id) ?? actor;

    const parts: LogLine[] = run.fired.length ? [...run.messages, ...summoned.messages] : [textRef("battleLog.ability.noEffect", { name: ability.name })];

    const legendaryText = logFields(textRef(lair ? "battleLog.legendary.runLair" : "battleLog.legendary.run", { name, ability: ability.name, counter: counter(after), text: joinLines(parts, " | ") }));

    return {
      participants,
      pending: ctx.pending,
      events: [
        {
          type: "ability",
          round,
          actorId: id,
          resultText: legendaryText.resultText,
          details: { actorName: name, actorSide: actor.basicInfo.side, actionDetails: { abilityKey: ability.key, skillName: ability.name }, ...(legendaryText.log && { log: legendaryText.log }) },
        },
      ],
    };
  };
}

export const legendaryMutation = createLegendaryMutation();
