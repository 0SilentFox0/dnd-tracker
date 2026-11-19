import { API_ERRORS } from '@/lib/constants/api-errors';
import type { SpellRequestData } from '@/lib/schemas/battles';
import type {
    Resolution,
    SpellDefinition,
    SpellMutationDeps,
} from '@/lib/server/battles/mutations/spell/cast-types';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { BattleRuleError } from '@/lib/utils/battle/store';
import type { CastSpellParams } from '@/lib/utils/battle/types/spell-process';

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

export async function resolvePicks(
    ctx: BattleMutationContext,
    deps: SpellMutationDeps,
    data: SpellRequestData,
    definition: SpellDefinition,
    resolution: Resolution
): Promise<Pick<CastSpellParams, 'pickedSpell'>> {
    const transform = definition.effects.find(
        (e) => e.kind === 'transform' && e.pick && !e.unitId
    );

    if (transform?.kind === 'transform' && transform.pick) {
        if (!data.pickedId) throw reject(API_ERRORS.BATTLE_SPELL_PICK_REQUIRED);

        const pool = await deps.loadPool(ctx.scene.campaignId);

        const unit = pool.units.find((u) => u.id === data.pickedId);

        const type = (unit?.statblock as { creatureType?: string } | null)
            ?.creatureType;

        const typeOk =
            type?.toLowerCase() === transform.pick.creatureType.toLowerCase();

        const crOk = resolution.targetIds.every((id) => {
            const target = findParticipant(ctx.participants, id);

            return (
                !!target &&
                (unit?.cr ?? 0) <= (target.abilities.cr ?? target.abilities.level)
            );
        });

        if (!unit || !typeOk || !crOk)
            throw reject(API_ERRORS.BATTLE_SPELL_PICK_INVALID);
    }

    const grant = definition.effects.find(
        (e) =>
            e.kind === 'grantSpell' &&
            (e.onOption === undefined || e.onOption === data.optionIndex)
    );

    if (grant?.kind !== 'grantSpell') return {};

    if (!data.pickedId) throw reject(API_ERRORS.BATTLE_SPELL_PICK_REQUIRED);

    const row = await deps.loadSpell(data.pickedId, ctx.scene.campaignId);

    if (!row || row.id === data.spellId || row.level > grant.maxLevel)
        throw reject(API_ERRORS.BATTLE_SPELL_PICK_INVALID);

    return { pickedSpell: { id: row.id, name: row.name, level: row.level } };
}
