import { healthState } from './health';
import { HP_BUCKET, PROJECTED_MAX_HP } from './hp-bucket';
import { canSeeExactStats, type Viewer } from './visibility';

import { stubReserve } from '@/lib/utils/battle/participant/reserve';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SlotScope } from '@/lib/utils/rules/systems/types-participant';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipantPatch } from '@/types/api';
import type {
    ActiveEffect,
    BattleAttack,
    BattleParticipant,
    BattleParticipantBattleData,
    BattleParticipantCombatStats,
} from '@/types/battle';

const PUBLIC_BATTLE_KEYS = [
    'attacks',
    'position',
    'movement',
    'facing',
    'turnStartPosition',
    'dying',
    'summonedBy',
    'phantomOf',
    'object',
    'dismissed',
    'extraTurnActive',
    'reserved',
    'revealPending',
    'escaped',
    'dormant',
    'auraZones',
    'airborne',
    'attacksLeft',
    'pendingExtraActions',
    'movementUsed',
    'readied',
    'returnedThisTurn',
    'mazeWakeRound',
    'hazardHitRound',
    'zoneHits',
] as const satisfies readonly (keyof BattleParticipantBattleData)[];

const PUBLIC_BATTLE_KEY_SET: ReadonlySet<string> = new Set(PUBLIC_BATTLE_KEYS);

function publicBattleFields<T extends object>(data: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(data).filter(
            ([key, value]) =>
                value !== undefined && PUBLIC_BATTLE_KEY_SET.has(key)
        )
    ) as Partial<T>;
}

const PUBLIC_ABILITY_KEYS = [
    'level',
    'initiative',
    'baseInitiative',
    'race',
    'raceId',
] as const;

export const NEUTRAL_SCORES = {
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
    proficiencyBonus: 0,
} as const;

const isExact = (p: BattleParticipant, viewer: Viewer): boolean =>
    viewer.userId !== null && p.basicInfo.controlledBy === viewer.userId
        ? true
        : canSeeExactStats(p, viewer);

function stripExt(slot: SystemSlot | undefined): SystemSlot | undefined {
    if (!slot || typeof slot.data !== 'object' || slot.data === null)
        return slot;

    if (!('ext' in slot.data)) return slot;

    const { ext: _ext, ...data } = slot.data as Record<string, unknown>;

    return { ...slot, data };
}

type SlotRedact = (
    slot: SystemSlot | undefined,
    scope: SlotScope
) => SystemSlot | undefined;

function slotRedactor(rules: Ruleset): SlotRedact {
    const hooks = ruleSystemOf(rules).participant?.redactSlot ?? [];

    return (slot, scope) => {
        const open = stripExt(slot);

        return open && hooks.reduce((acc, hook) => hook(acc, scope), open);
    };
}

const withoutConcealed = (effects: ActiveEffect[]) =>
    effects.filter((e) => !e.concealed);

const HIDDEN_STATS = [
    'morale',
] as const satisfies readonly (keyof BattleParticipantCombatStats)[];

const NEUTRAL_HIDDEN_STATS = Object.fromEntries(
    HIDDEN_STATS.map((key) => [key, 0])
) as Pick<BattleParticipantCombatStats, (typeof HIDDEN_STATS)[number]>;

const SECRET_ATTACK_KEYS = [
    'versatileDice',
    'damageBonus',
    'guaranteedDamage',
    'damageDistribution',
] as const satisfies readonly (keyof BattleAttack)[];

const SECRET_EFFECT_FLAGS = new Set(['resistance', 'spellAbsorb']);

function redactAttack(a: BattleAttack): BattleAttack {
    const open = { ...a, attackBonus: 0, damageDice: '' };

    for (const key of SECRET_ATTACK_KEYS) delete open[key];

    return open;
}

function redactAbilities(abilities: ResolvedAbility[]): ResolvedAbility[] {
    return abilities.flatMap((a) => {
        const effects = a.effects.filter(
            (e) =>
                !(
                    'flag' in e &&
                    typeof e.flag === 'string' &&
                    SECRET_EFFECT_FLAGS.has(e.flag)
                )
        );

        if (!effects.length && a.effects.length) return [];

        const { key, name, label, source, trigger } = a;

        const allPublic = effects.length === a.effects.length;

        // collectModifiers/auraKey read id, condition and params; they stay only when nothing secret was cut
        const readable = allPublic
            ? { id: a.id, condition: a.condition, params: a.params }
            : {};

        return [
            {
                key,
                name,
                label,
                source,
                trigger,
                effects,
                ...readable,
            } as ResolvedAbility,
        ];
    });
}

function projectHp(p: BattleParticipant) {
    const state = healthState(p);

    return {
        currentHp: HP_BUCKET[state],
        maxHp: PROJECTED_MAX_HP,
    };
}

function redactOne(
    p: BattleParticipant,
    redact: SlotRedact
): BattleParticipant {
    const { activeEffects, system, resolvedAbilities } = p.battleData;

    const battleData = {
        ...publicBattleFields(p.battleData),
        activeEffects: withoutConcealed(activeEffects),
        attacks: (p.battleData.attacks ?? []).map(redactAttack),
        equippedArtifacts: [],
        resolvedAbilities: redactAbilities(resolvedAbilities ?? []),
    } as BattleParticipantBattleData;

    const slot = redact(system, 'battle');

    if (slot) battleData.system = slot;

    const abilities = Object.fromEntries(
        Object.entries(p.abilities).filter(
            ([k, v]) =>
                v !== undefined &&
                (PUBLIC_ABILITY_KEYS as readonly string[]).includes(k)
        )
    ) as Pick<
        BattleParticipant['abilities'],
        (typeof PUBLIC_ABILITY_KEYS)[number]
    >;

    const abilitySlot = redact(p.abilities.system, 'abilities');

    return {
        ...p,
        abilities: {
            ...NEUTRAL_SCORES,
            ...abilities,
            ...(abilitySlot && { system: abilitySlot }),
        },
        combatStats: {
            ...p.combatStats,
            ...projectHp(p),
            tempHp: 0,
            armorClass: 0,
            ...NEUTRAL_HIDDEN_STATS,
        },
        spellcasting: { spellSlots: {}, knownSpells: [] },
        battleData,
    };
}

/** Server-side: what `viewer` may learn about each participant; own and ally participants stay whole, the rest is projected (HP to a health bucket, no AC/scores/ext). */
export function redactParticipantsForViewer(
    viewer: Viewer,
    participants: BattleParticipant[],
    rules: Ruleset
): BattleParticipant[] {
    if (viewer.isDM) return participants;

    const redact = slotRedactor(rules);

    const redacted = participants.map((p) =>
        isExact(p, viewer) ? p : redactOne(p, redact)
    );

    return redacted.some((p, i) => p !== participants[i])
        ? redacted
        : participants;
}

export const redactPendingForViewer = (
    viewer: Viewer,
    pending: BattleParticipant[],
    rules: Ruleset
): BattleParticipant[] =>
    viewer.isDM
        ? pending
        : stubReserve(redactParticipantsForViewer(viewer, pending, rules));

function redactPatch(
    patch: BattleParticipantPatch,
    owner: BattleParticipant,
    redact: SlotRedact
): BattleParticipantPatch {
    const {
        combatStats,
        abilities,
        battleData,
        spellcasting: _spells,
        ...rest
    } = patch;

    const out: BattleParticipantPatch = { ...rest };

    if (combatStats) {
        const {
            currentHp,
            maxHp,
            tempHp: _t,
            armorClass: _ac,
            ...stats
        } = combatStats;

        for (const key of HIDDEN_STATS) delete stats[key];

        const projected =
            currentHp !== undefined ||
            maxHp !== undefined ||
            stats.status !== undefined
                ? projectHp({
                      ...owner,
                      combatStats: {
                          ...owner.combatStats,
                          ...(currentHp !== undefined && { currentHp }),
                          ...(maxHp !== undefined && { maxHp }),
                          ...(stats.status !== undefined && {
                              status: stats.status,
                          }),
                      },
                  })
                : undefined;

        out.combatStats = { ...stats, ...projected };
    }

    if (abilities) {
        const { system, ...scores } = abilities;

        const kept = Object.fromEntries(
            PUBLIC_ABILITY_KEYS.flatMap((k) =>
                scores[k] === undefined ? [] : [[k, scores[k]]]
            )
        );

        const slot = redact(system, 'abilities');

        const next = { ...kept, ...(slot && { system: slot }) };

        if (Object.keys(next).length) out.abilities = next;
    }

    if (battleData) {
        const { activeEffects, system, resolvedAbilities } = battleData;

        const next: Partial<BattleParticipantBattleData> =
            publicBattleFields(battleData);

        if (resolvedAbilities)
            next.resolvedAbilities = redactAbilities(resolvedAbilities);

        if (next.attacks) next.attacks = next.attacks.map(redactAttack);

        if (activeEffects) next.activeEffects = withoutConcealed(activeEffects);

        const slot = redact(system, 'battle');

        if (slot) next.system = slot;

        if (Object.keys(next).length) out.battleData = next;
    }

    return out;
}

export function redactPatchesForViewer(
    viewer: Viewer,
    patches: BattleParticipantPatch[],
    participants: BattleParticipant[],
    rules: Ruleset
): BattleParticipantPatch[] {
    if (viewer.isDM) return patches;

    const redact = slotRedactor(rules);

    const byId = new Map(participants.map((p) => [p.basicInfo.id, p]));

    const redacted = patches.map((patch) => {
        const owner = byId.get(patch.id);

        return owner && !isExact(owner, viewer)
            ? redactPatch(patch, owner, redact)
            : patch;
    });

    return redacted.some((p, i) => p !== patches[i]) ? redacted : patches;
}
