import { ParticipantSide } from '@/lib/constants/battle';
import { spellLevelRoman } from '@/lib/constants/spells';
import { collectModifiers } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    isAirborne,
    withSelf,
} from '@/lib/utils/abilities/engine/core/participants';
import {
    battleLimit,
    cooldownLeft,
    poolLeft,
    withinCountLimits,
} from '@/lib/utils/abilities/engine/core/usage';
import { HARMFUL_FLAGS } from '@/lib/utils/abilities/engine/effects/harmful-flags';
import {
    deadTargetRules,
    isEligibleDeadTarget,
} from '@/lib/utils/abilities/target-rules';
import { calculateAttackBonus } from '@/lib/utils/battle/attack/bonus';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { attackDamageParts } from '@/lib/utils/battle/damage/attack-parts';
import { averageAttackDamage } from '@/lib/utils/battle/damage/average';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import { isUp } from '@/lib/utils/battle/participant/state';
import { spellNeedsSlot, spellSlotLeft } from '@/lib/utils/battle/spell/slot';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { PACT_KEY } from '@/lib/utils/spells/slot-keys';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type { BattleMapConfig } from '@/types/battle-grid';

export type SpellTier =
    | 'iron'
    | 'bronze'
    | 'silver'
    | 'gold'
    | 'mithril'
    | 'platinum'
    | 'adamant'
    | 'orichalcum'
    | 'starmetal'
    | 'void';

const TIERS: SpellTier[] = [
    'iron',
    'bronze',
    'silver',
    'gold',
    'mithril',
    'platinum',
    'adamant',
    'orichalcum',
    'starmetal',
    'void',
];

export function spellTier(level: number): SpellTier {
    return TIERS[Math.max(0, Math.min(9, level))];
}

export type SlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const SLOT_LEVELS: SlotLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function slotLevels(
    p: BattleParticipant
): { level: SlotLevel; max: number; current: number }[] {
    return SLOT_LEVELS.flatMap((level) => {
        const s = p.spellcasting?.spellSlots?.[String(level)];

        if (level > 5 && !(s && s.max > 0)) return [];

        return [{ level, max: s?.max ?? 0, current: s?.current ?? 0 }];
    });
}

export function pactSlot(
    p: BattleParticipant
): { level: number; max: number; current: number } | null {
    const pact = p.spellcasting?.spellSlots?.[PACT_KEY];

    return pact
        ? { level: pact.level ?? 1, max: pact.max, current: pact.current }
        : null;
}

export type SlotView = {
    level: number;
    roman: string;
    current: number;
    max: number;
    pact?: boolean;
};

export function heroSlotViews(p: BattleParticipant): SlotView[] {
    const views: SlotView[] = slotLevels(p)
        .filter((s) => s.max > 0)
        .map(({ level, current, max }) => ({
            level,
            roman: spellLevelRoman(level),
            current,
            max,
        }));

    const pact = pactSlot(p);

    if (!pact && views.length === 0) return [];

    return pact
        ? [
              ...views,
              {
                  level: pact.level,
                  roman: spellLevelRoman(pact.level),
                  current: pact.current,
                  max: pact.max,
                  pact: true,
              },
          ]
        : views;
}

export function defaultSlotLevel(slots: SlotView[]): number | null {
    const usable = slots.find((s) => s.current > 0);

    return (usable ?? slots.find((s) => s.max > 0))?.level ?? null;
}

/** Offset from the portrait centre for slot `i` of `n`, evenly around a full circle starting at the top */
export function slotRingOffset(
    i: number,
    n: number,
    radius: number
): { x: number; y: number } {
    const angle = (2 * Math.PI * i) / Math.max(1, n);

    return {
        x: Math.round(radius * Math.sin(angle) * 10) / 10,
        y: Math.round(-radius * Math.cos(angle) * 10) / 10,
    };
}

const ARC_START_DEG = -100;

const ARC_STEP_DEG = 21;

/** Offset from the portrait centre for slot `i`: a fixed arc fanning out to the right of the portrait, starting just left of the top */
export function slotArcOffset(
    i: number,
    radius: number
): { x: number; y: number } {
    const angle = ((ARC_START_DEG + ARC_STEP_DEG * i) * Math.PI) / 180;

    return {
        x: Math.round(radius * Math.cos(angle) * 10) / 10,
        y: Math.round(radius * Math.sin(angle) * 10) / 10,
    };
}

/** Arc radius that clears the portrait and keeps neighbouring slots from touching */
export function slotArcRadius(portrait: number, slot: number): number {
    const clear = portrait / 2 + slot / 2 + 14;

    const spread = (slot + 2) / (2 * Math.sin((ARC_STEP_DEG * Math.PI) / 360));

    return Math.ceil(Math.max(clear, spread));
}

/** Box height of the slot arc cluster: never shorter than the portrait, grows when the arc swings below it */
export function slotArcHeight(
    n: number,
    portrait: number,
    slot: number
): number {
    if (n < 1) return portrait;

    const radius = slotArcRadius(portrait, slot);

    const low = slotArcOffset(n - 1, radius).y + portrait / 2 + slot / 2;

    return Math.max(portrait, Math.ceil(low));
}

export function canCastBonusSpell(
    p: BattleParticipant,
    spells: { level: number; cost?: string | null }[]
): boolean {
    if (p.actionFlags.hasUsedBonusAction) return false;

    return spells.some(
        (s) =>
            s.cost === 'bonusAction' &&
            (!spellNeedsSlot(s.level) || spellSlotLeft(p, s.level) > 0)
    );
}

export interface AbilityCharge {
    key: string;
    name: string;
    icon?: string | null;
    left: number;
    limit: number | null;
    per: 'battle' | 'round' | 'turn' | 'rest' | null;
    cooldownLeft: number;
}

export function abilityCharges(
    p: BattleParticipant,
    round: number,
    triggers: readonly string[] = ['bonusAction', 'action']
): AbilityCharge[] {
    return (p.battleData.resolvedAbilities ?? []).flatMap(
        (a): AbilityCharge[] => {
            if (!triggers.includes(a.trigger.event) || !a.limits) return [];

            const per = a.limits.perBattle
                ? 'battle'
                : a.limits.perRest
                  ? 'rest'
                  : a.limits.perRound
                    ? 'round'
                    : a.limits.perTurn
                      ? 'turn'
                      : null;

            const cooldown = cooldownLeft(p, a, round);

            if (!per && !a.limits.cooldownRounds) return [];

            const base = {
                key: a.key,
                name: a.name,
                icon: a.source.icon ?? undefined,
                cooldownLeft: cooldown,
            };

            if (!per)
                return [
                    {
                        ...base,
                        left: cooldown > 0 ? 0 : 1,
                        limit: null,
                        per: null,
                    },
                ];

            const limit = (
                per === 'battle' || per === 'rest'
                    ? battleLimit(a.limits)
                    : per === 'round'
                      ? a.limits.perRound
                      : a.limits.perTurn
            ) as number;

            const used =
                p.battleData.abilityUsage?.[a.key]?.[
                    per === 'rest' ? 'battle' : per
                ] ?? 0;

            return [{ ...base, left: Math.max(0, limit - used), limit, per }];
        }
    );
}

const isManeuver = (a: ResolvedAbility) =>
    a.effects.some((e) => e.kind === 'maneuver');

const HOSTILE = new Set(['dealDamage', 'dot', 'applyCondition']);

export function bonusTargetSide(a: ResolvedAbility): ParticipantSide | null {
    if (isManeuver(a)) return ParticipantSide.ENEMY;

    const aimed = a.effects.filter(
        (e) => 'target' in e && e.target === 'eventTarget'
    );

    if (aimed.length === 0) return null;

    const hostile = aimed.some(
        (e) =>
            HOSTILE.has(e.kind) ||
            (e.kind === 'flag' && HARMFUL_FLAGS.has(e.flag)) ||
            ('flat' in e && typeof e.flat === 'number' && e.flat < 0) ||
            ('percent' in e && typeof e.percent === 'number' && e.percent < 0)
    );

    return hostile ? ParticipantSide.ENEMY : ParticipantSide.ALLY;
}

export interface PoolView {
    key: string;
    label: string;
    left: number;
    max: number;
}

export function poolViews(p: BattleParticipant): PoolView[] {
    return Object.entries(p.battleData.pools ?? {}).map(([key, pool]) => ({
        key,
        label: pool.label,
        left: poolLeft(p, key) ?? 0,
        max: pool.max,
    }));
}

export interface AbilityOption {
    ability: ResolvedAbility;
    cooldownLeft: number;
    pool?: PoolView & { cost: number };
}

export function abilityOptions(
    p: BattleParticipant,
    trigger: 'bonusAction' | 'action',
    round: number
): AbilityOption[] {
    const pools = poolViews(p);

    return (p.battleData.resolvedAbilities ?? [])
        .filter(
            (a) =>
                a.trigger.event === trigger &&
                !a.limits?.legendaryCost &&
                !a.limits?.lair &&
                withinCountLimits(p, a)
        )
        .map((ability) => {
            const ref = ability.limits?.pool;

            const view = ref && pools.find((v) => v.key === ref.key);

            return {
                ability,
                cooldownLeft: cooldownLeft(p, ability, round),
                ...(view && ref && { pool: { ...view, cost: ref.cost } }),
            };
        });
}

export function usableAbilities(
    p: BattleParticipant,
    trigger: 'bonusAction' | 'action',
    round: number
): ResolvedAbility[] {
    return abilityOptions(p, trigger, round)
        .filter((o) => o.cooldownLeft === 0)
        .map((o) => o.ability);
}

export function abilityOnMap(
    map: BattleMapConfig | null | undefined,
    p: BattleParticipant
): boolean {
    return !!map && !!p.battleData.position;
}

export function needsBonusTarget(a: ResolvedAbility, onMap = false): boolean {
    if (onMap && isManeuver(a)) return false;

    return bonusTargetSide(a) !== null || deadTargetRules(a).requiresDead;
}

export function bonusTargetCandidates(
    a: ResolvedAbility,
    allies: BattleParticipant[],
    enemies: BattleParticipant[],
    owner?: BattleParticipant,
    map?: BattleMapConfig | null
): BattleParticipant[] {
    const rules = deadTargetRules(a);

    if (rules.requiresDead)
        return [...allies, ...enemies].filter((p) =>
            isEligibleDeadTarget(rules, p, owner)
        );

    const selfId = owner?.basicInfo.id;

    const wantEnemy = bonusTargetSide(a) === ParticipantSide.ENEMY;

    const sided = owner
        ? [...allies, ...enemies].filter(
              (p) => isHostile(map, owner, p) === wantEnemy
          )
        : wantEnemy
          ? enemies
          : allies;

    const pool = sided.filter((p) => isUp(p) && !isAirborne(p));

    return a.effects.some((e) => e.kind === 'guard')
        ? pool.filter((p) => p.basicInfo.id !== selfId)
        : pool;
}

export function lastAction(log: BattleAction[]): BattleAction | null {
    for (let i = log.length - 1; i >= 0; i -= 1) {
        if (log[i].actionType !== 'end_turn') return log[i];
    }

    return null;
}

export function weaponPreview(
    p: BattleParticipant,
    attack: BattleAttack,
    rules: Ruleset,
    all: BattleParticipant[]
) {
    const mods = collectModifiers(withSelf(all, p), p.basicInfo.id, {
        damage: { kind: attackKindOf(attack.type) },
    });

    const bonuses = mods.entries
        .filter((e) => e.percent || e.flat)
        .map((e) => ({
            label: e.label,
            percent: e.percent,
            flat: e.flat,
            icon: e.icon,
        }));

    const estimate = averageAttackDamage(p, attack, rules, all).total;

    return {
        bonuses,
        estimate,
        toHit: calculateAttackBonus(p, attack, rules, all),
        formula: attackDamageParts(p, attack, rules).formula,
    };
}
