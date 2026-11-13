import type { SummonRequest } from '@/lib/utils/abilities/engine/core/types';
import { spellAttackBonus } from '@/lib/utils/battle/spell/power';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type {
    SpellEffect,
    SummonInlineEffect,
} from '@/lib/utils/spells/model/schema';
import type { AnchoredZoneState, BattleParticipant } from '@/types/battle';

interface SummonInlineInput {
    effects: SpellEffect[];
    caster: BattleParticipant;
    rules: Ruleset;
    spell: { id: string; name: string; level: number };
    castLevel: number;
    saveDc: number | undefined;
    round: number;
    castId: string;
    concentrationOf?: { casterId: string; castId: string };
}

const isSummonInline = (e: SpellEffect): e is SummonInlineEffect =>
    e.kind === 'summonInline';

export function inlineSummonRequests({
    effects,
    caster,
    rules,
    spell,
    castLevel,
    saveDc,
    round,
    castId,
    concentrationOf,
}: SummonInlineInput): SummonRequest[] {
    const ownerId = caster.basicInfo.id;

    return effects.filter(isSummonInline).map((e) => {
        const extra = e.upcastEvery
            ? Math.floor(Math.max(0, castLevel - spell.level) / e.upcastEvery)
            : 0;

        const zone: AnchoredZoneState | undefined = e.aura && {
            casterId: ownerId,
            spellId: spell.id,
            spellName: spell.name,
            ...(saveDc !== undefined && { dc: saveDc }),
            radiusFeet: e.aura.radiusFeet,
            side: e.aura.side,
            ...(e.aura.onEnter && { onEnter: e.aura.onEnter }),
            ...(e.aura.onTurnStart && { onTurnStart: e.aura.onTurnStart }),
            ...(e.aura.onEnter?.attack || e.aura.onTurnStart?.attack
                ? { attackBonus: spellAttackBonus(caster, rules) }
                : {}),
        };

        return {
            ownerId,
            count: e.count + extra,
            spellId: spell.id,
            castId,
            expiresRound: round + e.duration.rounds,
            ...(concentrationOf && { concentrationOf }),
            inline: {
                name: e.name,
                size: e.size,
                ac: e.ac === 'spellDc' ? (saveDc ?? 10) : e.ac,
                hp: e.hp,
                ...(e.attacks && { attacks: e.attacks }),
                ...(zone && { zone, zoneRounds: e.duration.rounds }),
            },
        };
    });
}
