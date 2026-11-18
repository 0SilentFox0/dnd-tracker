import { healthState } from './health';
import { HP_BUCKET, PROJECTED_MAX_HP } from './hp-bucket';
import { canSeeExactStats, type Viewer } from './visibility';

import { stubReserve } from '@/lib/utils/battle/participant/reserve';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SlotScope } from '@/lib/utils/rules/systems/types-participant';
import type { BattleParticipantPatch } from '@/types/api';
import type {
    ActiveEffect,
    BattleParticipant,
    BattleParticipantBattleData,
} from '@/types/battle';

const SECRET_BATTLE_KEYS = [
    'hpMultiplier',
    'damageMultiplier',
    'lairResistances',
    'senses',
    'languages',
    'telepathy',
    'pendingHits',
    'ingredientStock',
    'legendary',
] as const satisfies readonly (keyof BattleParticipantBattleData)[];

const PUBLIC_ABILITY_KEYS = [
    'level',
    'initiative',
    'baseInitiative',
    'race',
    'raceId',
] as const;

const NEUTRAL_SCORES = {
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
    const { activeEffects, system, ...battleRest } = p.battleData;

    const battleData = { ...battleRest } as BattleParticipantBattleData;

    for (const key of SECRET_BATTLE_KEYS) delete battleData[key];

    battleData.activeEffects = withoutConcealed(activeEffects);

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
        const { activeEffects, system, ...data } = battleData;

        const next: Partial<BattleParticipantBattleData> = { ...data };

        for (const key of SECRET_BATTLE_KEYS) delete next[key];

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
