import type { Characteristics } from './characteristics/keys';
import type { SheetWfrpBlock } from './characteristics/sheet-block';
import type { WfrpParticipantStats } from './combat/participant';
import { WEAPON_REACHES } from './equipment/constants';
import { qualityList } from './equipment/guard';
import type { QualityRef } from './equipment/qualities';
import type { WfrpWeaponStats } from './equipment/stats';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from './percentile/details';
import { type BreathKind, isBreath } from './trait-kinds';

import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { ParticipantSide } from '@/types/battle';

export type WfrpHand = 'main' | 'off';

type WeaponReach = NonNullable<WfrpWeaponStats['reach']>;

export interface WfrpAttackSlot {
    qualities: QualityRef[];
    flaws: QualityRef[];
    noSb?: boolean;
    magical?: true;
    /** Hand the weapon is held in; absent for trait, unarmed and spell attacks */
    hand?: WfrpHand;
    /** Weapon group, picks the Melee/Ranged skill speciality */
    group?: string;
    /** Needs both hands, canon gear only: unusable with either arm disabled (p164) */
    twoHanded?: true;
    /** Weapon reach, canon gear only (p300) */
    reach?: WeaponReach;
    /** Blade weapon, canon gear only: Trap Blade can catch it (p305) */
    bladed?: true;
    /** Trait attack made as a free attack: no Size damage bonus (p360) */
    free?: true;
    /** Breath type of a creature's breath attack (p358) */
    breath?: BreathKind;
}

// Legacy rows stored `hand: true` (main) and `offHand: true` (off)
function handOf(raw: Record<string, unknown>): WfrpHand | undefined {
    if (raw.hand === 'main' || raw.hand === 'off') return raw.hand;

    if (raw.offHand === true) return 'off';

    return raw.hand === true ? 'main' : undefined;
}

export const ATTACK_SLOT = defineSlot<WfrpAttackSlot>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    const qualities = qualityList(raw.qualities);

    const flaws = qualityList(raw.flaws);

    if (!qualities || !flaws) return undefined;

    return {
        qualities,
        flaws,
        ...(typeof raw.group === 'string' && { group: raw.group }),
        ...(typeof raw.reach === 'string' &&
            (WEAPON_REACHES as readonly string[]).includes(raw.reach) && {
                reach: raw.reach as WeaponReach,
            }),
        ...(raw.twoHanded === true && { twoHanded: true as const }),
        ...(raw.bladed === true && { bladed: true as const }),
        ...(raw.noSb === true && { noSb: true }),
        ...(raw.free === true && { free: true as const }),
        ...(isBreath(raw.breath) && { breath: raw.breath }),
        ...(raw.magical === true && { magical: true as const }),
        ...(handOf(raw) && { hand: handOf(raw) }),
    };
});

export interface WfrpParticipantSlot {
    characteristics: Characteristics;
    stats: WfrpParticipantStats;
}

export const PARTICIPANT_SLOT = defineSlot<WfrpParticipantSlot>(
    'wfrp',
    (raw) =>
        isRecord(raw) && isRecord(raw.characteristics) && isRecord(raw.stats)
            ? (raw as unknown as WfrpParticipantSlot)
            : undefined
);

export const SHEET_SLOT = defineSlot<SheetWfrpBlock>('wfrp', (raw) =>
    isRecord(raw) ? (raw as unknown as SheetWfrpBlock) : undefined
);

export interface WfrpActionSlot {
    attack?: PercentileAttackDetails;
    cast?: PercentileCastDetails;
}

export const ACTION_SLOT = defineSlot<WfrpActionSlot>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    const attack = isRecord(raw.attack)
        ? (raw.attack as unknown as PercentileAttackDetails)
        : undefined;

    const cast = isRecord(raw.cast)
        ? (raw.cast as unknown as PercentileCastDetails)
        : undefined;

    return attack || cast
        ? { ...(attack && { attack }), ...(cast && { cast }) }
        : undefined;
});

export type SceneMomentum = Partial<Record<ParticipantSide, true>>;

export const SCENE_SLOT = defineSlot<SceneMomentum>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    return Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v === true)
    ) as SceneMomentum;
});

export type WfrpMoveMode = 'run' | 'sprint' | 'charge' | 'flee';

export interface WfrpParticipantState {
    fortune?: number;
    /** Current Fate where Fate is its own pool (canon5e) */
    fate?: number;
    /** Personal Momentum, canon5e only (p168) */
    momentum?: true;
    /** Fled the fight alive through Fate "Not Today" (p133), canon5e */
    outOfFight?: true;
    /** Spent Momentum on the second weapon's attack this turn (p167) */
    momentumAttack?: true;
    /** Hand of the last weapon attack this turn, or `cast` after a spell (p167) */
    lastHand?: WfrpHand | 'cast';
    /** A melee attack hit this turn: the Parry weapon's second attack is then unopposed (p304), canon gear */
    meleeHit?: true;
    channelledSl?: number;
    /** Channelled this turn, so the pool needs no upkeep test (canon5e, p236) */
    channelledNow?: true;
    /** SL lost to a channelling mishap: the next miscast roll gets +10 per SL (canon5e, p236) */
    miscastSl?: number;
    /** The spell cast last, until the caster's next turn: read by the reactive Dispel window (canon5e, p237) */
    lastCast?: LastCast;
    /** Persistent Dispel in progress: SL gathered against the held spell (canon5e, p237) */
    dispelProgress?: { targetId: string; castId: string; progress: number };
    /** Round of the last reactive Dispel attempt: one per round (canon5e, p237) */
    dispelRound?: number;
    /** Movement chosen this turn, canon5e (p163); a Charge limits attacks to melee */
    moveMode?: WfrpMoveMode;
    /** Aimed at this target; the next attack gains the Aim bonus (canon actionsModel) */
    aim?: { targetId: string };
    /** Round of the last Action taken, for end-of-turn expiry of stances and aiming */
    actLastRound?: number;
    /** Defensive stance: the skill the fighter parries or dodges with until its next turn */
    defensive?: { skill: string };
    /** Attack journal: round-starts an engagement with each foe still lasts, keyed by foe id (canon actionsModel) */
    engagedWith?: Record<string, number>;
    /** Locked in a grapple, `holder` marks the one holding */
    grapple?: { with: string; holder: boolean };
    /** Wounds from fire; a regenerating creature cannot heal them (p358) */
    fireWounds?: number;
    /** Breath: the attacker's one roll shared by every target of the volley (p358) */
    breathRoll?: { attackId: string; roll: number; seen: string[] };
    /** Wear taken by each weapon, keyed by attack id */
    weaponWear?: Record<string, number>;
    /** Oops: act last in the next round; the round-start hook moves the fighter to the end and clears it */
    actLastNext?: true;
    /** Oops -1 SL on every test: `next` until the next round begins, then `now` for that whole round */
    oopsPenalty?: 'next' | 'now';
    /** Riding a mount (DM switch): its id and Strength Bonus, which a mounted Charge uses (p168) */
    mounted?: { mountId: string; sb?: number };
    /** Critical Wounds taken this battle, canon5e (p172) */
    critWounds?: number;
    /** Rounds left before a critically wounded, unconscious fighter dies (p172) */
    dyingRounds?: number;
    sin?: number;
    /** Under a Malignant Influence: a Minor miscast becomes Major, canon5e (p237) */
    malignant?: true;
    conditionTests?: string[];
    psychologyTested?: Partial<Record<string, number>>;
    /** Unresolved Fear by source id, canon5e (p183): SL gathered so far toward `rating`, `round` of the last roll */
    fear?: Record<string, FearEntry>;
    /** In a Frenzy, canon5e (p184) */
    frenzy?: true;
    /** Round of the last Willpower test to enter a Frenzy: one try per turn */
    frenzyTried?: number;
    /** Hatred (must attack the group) or Animosity (`kind`: must insult or attack it) the fighter failed to master, canon5e (p183-184); `round` is when it took hold */
    compelled?: Record<string, CompelEntry>;
}

export interface LastCast {
    spell: string;
    sl: number;
    at?: { x: number; y: number };
    targets?: { x: number; y: number }[];
    critBonus?: 'criticalDamage' | 'totalPower' | 'unstoppableForce';
}

export interface CompelEntry {
    group: string;
    round: number;
    kind?: 'animosity';
}

export interface FearEntry {
    rating: number;
    sl: number;
    round: number;
}

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

export const PARTICIPANT_STATE = defineSlot<WfrpParticipantState>(
    'wfrp',
    (raw) => {
        if (!isRecord(raw)) return undefined;

        const tested = isRecord(raw.psychologyTested)
            ? Object.fromEntries(
                  Object.entries(raw.psychologyTested).filter(([, v]) =>
                      finite(v)
                  )
              )
            : undefined;

        const fear = isRecord(raw.fear)
            ? Object.fromEntries(
                  Object.entries(raw.fear).flatMap(([id, e]) =>
                      isRecord(e) &&
                      finite(e.rating) &&
                      finite(e.sl) &&
                      finite(e.round)
                          ? [
                                [
                                    id,
                                    {
                                        rating: e.rating,
                                        sl: e.sl,
                                        round: e.round,
                                    },
                                ],
                            ]
                          : []
                  )
              )
            : undefined;

        const numbers = (v: unknown): Record<string, number> | undefined =>
            isRecord(v)
                ? (Object.fromEntries(
                      Object.entries(v).filter(([, n]) => finite(n))
                  ) as Record<string, number>)
                : undefined;

        const engagedWith = numbers(raw.engagedWith);

        const weaponWear = numbers(raw.weaponWear);

        const compelled = isRecord(raw.compelled)
            ? Object.fromEntries(
                  Object.entries(raw.compelled).flatMap(([k, e]) =>
                      isRecord(e) &&
                      typeof e.group === 'string' &&
                      finite(e.round)
                          ? [
                                [
                                    k,
                                    {
                                        group: e.group,
                                        round: e.round,
                                        ...(e.kind === 'animosity' && {
                                            kind: 'animosity' as const,
                                        }),
                                    },
                                ],
                            ]
                          : []
                  )
              )
            : undefined;

        return {
            ...(finite(raw.fortune) && { fortune: raw.fortune }),
            ...(finite(raw.fate) && { fate: raw.fate }),
            ...(raw.momentum === true && { momentum: true as const }),
            ...(raw.outOfFight === true && { outOfFight: true as const }),
            ...(raw.momentumAttack === true && {
                momentumAttack: true as const,
            }),
            ...((raw.lastHand === 'main' ||
                raw.lastHand === 'off' ||
                raw.lastHand === 'cast') && { lastHand: raw.lastHand }),
            ...(raw.meleeHit === true && { meleeHit: true as const }),
            ...(finite(raw.channelledSl) && { channelledSl: raw.channelledSl }),
            ...(raw.channelledNow === true && {
                channelledNow: true as const,
            }),
            ...(finite(raw.miscastSl) && { miscastSl: raw.miscastSl }),
            ...(isRecord(raw.lastCast) &&
                typeof raw.lastCast.spell === 'string' &&
                finite(raw.lastCast.sl) && {
                    lastCast: {
                        spell: raw.lastCast.spell,
                        sl: raw.lastCast.sl,
                        ...(isRecord(raw.lastCast.at) &&
                            finite(raw.lastCast.at.x) &&
                            finite(raw.lastCast.at.y) && {
                                at: {
                                    x: raw.lastCast.at.x,
                                    y: raw.lastCast.at.y,
                                },
                            }),
                        ...(Array.isArray(raw.lastCast.targets) && {
                            targets: raw.lastCast.targets.flatMap(
                                (t: unknown) =>
                                    isRecord(t) && finite(t.x) && finite(t.y)
                                        ? [{ x: t.x, y: t.y }]
                                        : []
                            ),
                        }),
                        ...((raw.lastCast.critBonus === 'criticalDamage' ||
                            raw.lastCast.critBonus === 'totalPower' ||
                            raw.lastCast.critBonus === 'unstoppableForce') && {
                            critBonus: raw.lastCast.critBonus,
                        }),
                    },
                }),
            ...(isRecord(raw.dispelProgress) &&
                typeof raw.dispelProgress.targetId === 'string' &&
                typeof raw.dispelProgress.castId === 'string' &&
                finite(raw.dispelProgress.progress) && {
                    dispelProgress: {
                        targetId: raw.dispelProgress.targetId,
                        castId: raw.dispelProgress.castId,
                        progress: raw.dispelProgress.progress,
                    },
                }),
            ...(finite(raw.dispelRound) && { dispelRound: raw.dispelRound }),
            ...((raw.moveMode === 'run' ||
                raw.moveMode === 'sprint' ||
                raw.moveMode === 'charge' ||
                raw.moveMode === 'flee') && { moveMode: raw.moveMode }),
            ...(isRecord(raw.aim) &&
                typeof raw.aim.targetId === 'string' && {
                    aim: { targetId: raw.aim.targetId },
                }),
            ...(finite(raw.actLastRound) && { actLastRound: raw.actLastRound }),
            ...(isRecord(raw.defensive) &&
                typeof raw.defensive.skill === 'string' && {
                    defensive: { skill: raw.defensive.skill },
                }),
            ...(engagedWith && { engagedWith }),
            ...(isRecord(raw.grapple) &&
                typeof raw.grapple.with === 'string' &&
                typeof raw.grapple.holder === 'boolean' && {
                    grapple: {
                        with: raw.grapple.with,
                        holder: raw.grapple.holder,
                    },
                }),
            ...(finite(raw.fireWounds) && { fireWounds: raw.fireWounds }),
            ...(isRecord(raw.breathRoll) &&
                finite(raw.breathRoll.roll) &&
                typeof raw.breathRoll.attackId === 'string' &&
                Array.isArray(raw.breathRoll.seen) && {
                    breathRoll: {
                        roll: raw.breathRoll.roll,
                        attackId: raw.breathRoll.attackId,
                        seen: raw.breathRoll.seen.filter(
                            (id): id is string => typeof id === 'string'
                        ),
                    },
                }),
            ...(weaponWear && { weaponWear }),
            ...(raw.actLastNext === true && { actLastNext: true as const }),
            ...((raw.oopsPenalty === 'next' || raw.oopsPenalty === 'now') && {
                oopsPenalty: raw.oopsPenalty,
            }),
            ...(isRecord(raw.mounted) &&
                typeof raw.mounted.mountId === 'string' && {
                    mounted: {
                        mountId: raw.mounted.mountId,
                        ...(finite(raw.mounted.sb) && { sb: raw.mounted.sb }),
                    },
                }),
            ...(finite(raw.critWounds) && { critWounds: raw.critWounds }),
            ...(finite(raw.dyingRounds) && { dyingRounds: raw.dyingRounds }),
            ...(finite(raw.sin) && { sin: raw.sin }),
            ...(raw.malignant === true && { malignant: true as const }),
            ...(Array.isArray(raw.conditionTests) && {
                conditionTests: raw.conditionTests.filter(
                    (k): k is string => typeof k === 'string'
                ),
            }),
            ...(raw.frenzy === true && { frenzy: true as const }),
            ...(finite(raw.frenzyTried) && { frenzyTried: raw.frenzyTried }),
            ...(fear && Object.keys(fear).length > 0 && { fear }),
            ...(compelled &&
                Object.keys(compelled).length > 0 && { compelled }),
            ...(tested && {
                psychologyTested: tested as Record<string, number>,
            }),
        };
    }
);
