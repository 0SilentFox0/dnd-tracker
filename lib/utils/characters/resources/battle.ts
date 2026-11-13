import { compactResources, currentHp, withHp } from './hp';
import { readResources } from './schema';

import { CombatStatus } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import {
    exhaustionLevel,
    PERMANENT_ROUNDS,
} from '@/lib/utils/battle/conditions';
import { isCastPool, isConsumablePool } from '@/lib/utils/items/pools';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { PersistOutcome } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type {
    CharacterResources,
    StoredCharacterState,
} from '@/types/characters';

export const REST_EXHAUSTION_KEY = 'rest:exhaustion';

export function storedCharacterState(
    character: { resources?: unknown; inspiration?: boolean | null },
    rules: Ruleset
): StoredCharacterState {
    return {
        resources: rules.outOfCombat.persistResources
            ? readResources(character.resources)
            : null,
        inspiration: rules.outOfCombat.inspiration
            ? !!character.inspiration
            : null,
    };
}

function withExhaustion(
    p: BattleParticipant,
    level: number,
    rules: Ruleset
): BattleParticipant {
    if (level <= 0) return p;

    const applied = ruleSystemOf(rules).conditionSet.apply(
        [p],
        p.basicInfo.id,
        {
            key: 'exhaustion',
            rounds: PERMANENT_ROUNDS,
            permanent: true,
            levels: level,
            source: undefined,
            sourceName: textRef('abilityText.derived.exhaustion'),
            timedKey: REST_EXHAUSTION_KEY,
            round: 0,
            rules,
        }
    );

    return applied.participants[0] ?? p;
}

function withSpentSlots(
    p: BattleParticipant,
    spent: CharacterResources['slotsSpent']
): BattleParticipant {
    const slots = p.spellcasting.spellSlots;

    if (!spent || !slots) return p;

    const next = Object.fromEntries(
        Object.entries(slots).map(([k, s]) => [
            k,
            { ...s, current: Math.max(0, s.max - (spent[k] ?? 0)) },
        ])
    );

    return { ...p, spellcasting: { ...p.spellcasting, spellSlots: next } };
}

const isPersistedPool = (key: string) =>
    !isConsumablePool(key) && !isCastPool(key);

function withCharges(
    p: BattleParticipant,
    charges: CharacterResources['charges']
): BattleParticipant {
    if (!charges) return p;

    const usage = { ...p.battleData.abilityUsage };

    for (const a of p.battleData.resolvedAbilities) {
        const used = a.limits?.perRest ? (charges[a.key]?.used ?? 0) : 0;

        if (used > 0) usage[a.key] = { battle: used, round: 0, turn: 0 };
    }

    for (const key of Object.keys(p.battleData.pools ?? {}).filter(
        isPersistedPool
    )) {
        const used = charges[key]?.used ?? 0;

        if (used > 0) usage[key] = { battle: used, round: 0, turn: 0 };
    }

    return { ...p, battleData: { ...p.battleData, abilityUsage: usage } };
}

function withHpState(
    p: BattleParticipant,
    r: CharacterResources,
    rules: Ruleset
): BattleParticipant {
    const stats = p.combatStats;

    if (stats.status === CombatStatus.DEAD) return p;

    if (r.dead)
        return {
            ...p,
            combatStats: {
                ...stats,
                currentHp: 0,
                tempHp: 0,
                status: CombatStatus.DEAD,
            },
        };

    const hp = currentHp(r, stats.maxHp);

    const tempHp = r.tempHp ?? 0;

    if (hp > 0)
        return { ...p, combatStats: { ...stats, currentHp: hp, tempHp } };

    const before = { ...p, combatStats: { ...stats, currentHp: 1 } };

    const after = {
        ...p,
        combatStats: {
            ...stats,
            tempHp,
            currentHp: 0,
            status: CombatStatus.UNCONSCIOUS,
        },
    };

    return ruleSystemOf(rules).combat.onZeroHp({
        before,
        after,
        amount: 0,
        rules,
        rng: () => 0,
        participants: [after],
        manual: true,
    }).participant;
}

export function applyCharacterResources(
    p: BattleParticipant,
    state: StoredCharacterState,
    rules: Ruleset
): BattleParticipant {
    const r = state.resources;

    const out = r
        ? withHpState(
              withCharges(
                  withSpentSlots(
                      withExhaustion(p, r.exhaustion ?? 0, rules),
                      r.slotsSpent
                  ),
                  r.charges
              ),
              r,
              rules
          )
        : p;

    const parts = ruleSystemOf(rules).participant?.fromStored ?? [];

    return parts.reduce(
        (acc, part) => part(acc, { stored: state, rules }),
        out
    );
}

export function spentSlots(p: BattleParticipant): Record<string, number> {
    return Object.fromEntries(
        Object.entries(p.spellcasting.spellSlots ?? {}).flatMap(([k, s]) =>
            s.max - s.current > 0 ? [[k, s.max - s.current]] : []
        )
    );
}

function battleCharges(
    prev: CharacterResources['charges'],
    p: BattleParticipant
): CharacterResources['charges'] {
    const perRest = [
        ...p.battleData.resolvedAbilities.flatMap((a) =>
            a.limits?.perRest
                ? [
                      {
                          key: a.key,
                          rest: a.limits.perRest.rest,
                          regain: a.limits.perRest.shortRegain,
                      },
                  ]
                : []
        ),
        ...Object.entries(p.battleData.pools ?? {})
            .filter(([key]) => isPersistedPool(key))
            .map(([key, pool]) => ({
                key,
                rest: pool.rest,
                regain: undefined,
            })),
    ];

    const own = new Set(perRest.map((a) => a.key));

    const kept = Object.entries(prev ?? {}).filter(([k]) => !own.has(k));

    const used = perRest.flatMap(({ key, rest, regain }) => {
        const n = p.battleData.abilityUsage?.[key]?.battle ?? 0;

        return n > 0
            ? [[key, { used: n, rest, ...(regain && { regain }) }] as const]
            : [];
    });

    return Object.fromEntries([...kept, ...used]);
}

export function battleResultOutcome(
    r: CharacterResources,
    p: BattleParticipant,
    rules: Ruleset
): PersistOutcome {
    const { maxHp, currentHp: hp, tempHp, status } = p.combatStats;

    const dead = status === CombatStatus.DEAD;

    const next: CharacterResources = {
        ...r,
        tempHp: dead ? undefined : tempHp,
        dead: dead || undefined,
        slotsSpent: spentSlots(p),
        charges: battleCharges(r.charges, p),
        exhaustion: exhaustionLevel(p),
        shortRestOpen: undefined,
    };

    const written = dead
        ? { ...next, hp: 0 }
        : withHp(next, Math.max(0, hp), maxHp);

    const parts = ruleSystemOf(rules).participant?.persist ?? [];

    const outcome = parts.reduce(
        (acc, part) => part({ participant: p, rules }, acc),
        { resources: written } as PersistOutcome
    );

    return { ...outcome, resources: compactResources(outcome.resources) };
}

export const applyBattleResult = (
    r: CharacterResources,
    p: BattleParticipant,
    rules: Ruleset
): CharacterResources => battleResultOutcome(r, p, rules).resources;

export function battleResultLogData(
    before: CharacterResources,
    p: BattleParticipant,
    battleId: string
): Record<string, unknown> {
    const { maxHp, currentHp: hp, status } = p.combatStats;

    return {
        battleId,
        hpBefore: currentHp(before, maxHp),
        hpAfter: Math.max(0, hp),
        maxHp,
        dead: status === CombatStatus.DEAD,
        slotsSpent: spentSlots(p),
    };
}
