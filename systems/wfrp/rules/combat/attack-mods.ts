import {
    againstSl,
    entangledTargetSl,
    proneAttackerSl,
    proneTargetRangedSl,
    surprisedRangedSl,
} from '../conditions/test-mod';
import type { EditionProfile } from '../edition';
import { REACH_RANK } from '../equipment/weapon-profile';
import type { FortuneInput } from '../percentile/fortune';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { hatesTarget, HATRED_SL_BONUS } from '../traits/passions';
import { sizeRangedSl } from '../traits/size';
import {
    AIM_SL,
    CALLED_SHOT_SL,
    COVER_SL,
    ENCLOSED_LONG_SL,
    ENCLOSED_SL,
    HIGH_GROUND_SL,
    MOVED_SL,
    OFFHAND_SL_PENALTY,
    OUTNUMBERED_SL,
    RANGE_BAND_SL,
    SURROUNDED_SL,
    TERRAIN_SL,
    WEATHER_SL,
} from './constants';
import { engagedFoes, isOutnumbering, isSurrounded } from './engagement';
import { shotBand } from './range-band';

import { cellKey } from '@/lib/utils/battle/grid/geometry';
import { cellsOf } from '@/lib/utils/battle/grid/occupancy';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export type AttackModKey =
    | 'sizeRanged'
    | 'outnumbered'
    | 'surrounded'
    | 'offHand'
    | 'hatred'
    | 'highGround'
    | 'defenderHighGround'
    | 'terrain'
    | 'enclosed'
    | 'attackerProne'
    | 'targetEntangled'
    | 'targetSurprised'
    | 'targetProneRanged'
    | 'range'
    | 'cover'
    | 'aim'
    | 'moved'
    | 'weather'
    | 'intoMelee'
    | 'calledShot'
    | 'talent'
    | 'quality';

export interface AttackMod {
    key: AttackModKey;
    sl: number;
    disadvantage?: number;
}

export interface AttackModCtx {
    attacker: BattleParticipant;
    target: BattleParticipant;
    attack: BattleAttack;
    participants: BattleParticipant[];
    map: BattleMapConfig | null | undefined;
    edition: EditionProfile;
    input: FortuneInput | undefined;
    /** SL already worked out elsewhere: talents and the weapon's qualities and flaws */
    sources: { talent: number; quality: number };
    cellFeet: number;
    /** The line of fire is blocked by cover */
    obstacle?: boolean;
}

const isCanon = (e: EditionProfile) => e.combatModsModel === 'canon5e';

const onDifficultGround = (
    p: BattleParticipant,
    map: BattleMapConfig | null | undefined
) =>
    !!map?.terrain &&
    cellsOf(p).some((c) => {
        const cell = map.terrain?.[cellKey(c)];

        return cell?.difficult || cell?.kind === 'difficult';
    });

function commonMods(ctx: AttackModCtx): AttackMod[] {
    const { attacker, target, attack, edition, input, sources } = ctx;

    const slot = ATTACK_SLOT.read(attack.system);

    return [
        {
            key: 'offHand',
            sl:
                edition.momentumModel === 'participant' && slot?.hand === 'off'
                    ? -OFFHAND_SL_PENALTY
                    : 0,
        },
        {
            key: 'hatred',
            sl:
                edition.psychologyModel === 'extended' &&
                hatesTarget(attacker, target)
                    ? HATRED_SL_BONUS
                    : 0,
        },
        { key: 'talent', sl: sources.talent },
        { key: 'quality', sl: sources.quality },
        {
            key: 'calledShot',
            sl: isCanon(edition) && input?.calledShot ? CALLED_SHOT_SL : 0,
        },
    ];
}

const nonZero = (mods: AttackMod[]) =>
    mods.filter((m) => m.sl !== 0 || m.disadvantage);

/** Melee attack modifiers, add all that apply (p166); the legacy model keeps its +10% outnumbering and size hit shift elsewhere */
export function meleeAttackMods(ctx: AttackModCtx): AttackMod[] {
    const { attacker, target, participants, map, edition, input } = ctx;

    const against = againstSl(target, 'melee', edition);

    const conditionMods: AttackMod[] = [
        { key: 'targetSurprised', sl: against.sl },
        { key: 'targetEntangled', sl: entangledTargetSl(target, edition) },
    ];

    if (!isCanon(edition))
        return nonZero([...commonMods(ctx), ...conditionMods]);

    const surrounded = isSurrounded(engagedFoes(target, participants, map));

    const outnumbered =
        !surrounded &&
        isOutnumbering(attacker, target, participants, map, edition);

    const situational = input?.situational;

    const reach = ATTACK_SLOT.read(ctx.attack.system)?.reach;

    const enclosed = situational?.enclosed
        ? reach === undefined || REACH_RANK[reach] < REACH_RANK.average
            ? 0
            : reach === 'average'
              ? ENCLOSED_SL
              : ENCLOSED_LONG_SL
        : 0;

    const high = situational?.highGround;

    return nonZero([
        ...commonMods(ctx),
        { key: 'surrounded', sl: surrounded ? SURROUNDED_SL : 0 },
        { key: 'outnumbered', sl: outnumbered ? OUTNUMBERED_SL : 0 },
        ...conditionMods,
        { key: 'highGround', sl: high === 'attacker' ? HIGH_GROUND_SL : 0 },
        {
            key: 'defenderHighGround',
            sl: high === 'defender' ? -HIGH_GROUND_SL : 0,
        },
        {
            key: 'terrain',
            sl:
                situational?.badFooting || onDifficultGround(attacker, map)
                    ? TERRAIN_SL
                    : 0,
        },
        { key: 'enclosed', sl: enclosed },
        { key: 'attackerProne', sl: proneAttackerSl(attacker, edition) },
    ]);
}

const weatherSl = (map: BattleMapConfig | null | undefined) =>
    (map?.weather && WEATHER_SL[map.weather]) || 0;

const aimedAt = (attacker: BattleParticipant, target: BattleParticipant) => {
    const aim = wfrpState(attacker).aim;

    return (
        !!aim &&
        aim.targetId === target.basicInfo.id &&
        (attacker.battleData.movementUsed ?? 0) <= aim.movementUsed
    );
};

/** Ranged attack modifiers, add all that apply (p166-167); a shot at an Engaged target gets Disadvantage */
export function rangedAttackMods(ctx: AttackModCtx): AttackMod[] {
    const { attacker, target, attack, participants, map, edition } = ctx;

    if (!isCanon(edition)) return nonZero(commonMods(ctx));

    const intoMelee = engagedFoes(target, participants, map).some(
        (f) => f.basicInfo.id !== attacker.basicInfo.id
    );

    return nonZero([
        ...commonMods(ctx),
        { key: 'sizeRanged', sl: sizeRangedSl(attacker, target) },
        {
            key: 'range',
            sl: RANGE_BAND_SL[
                shotBand(attacker, target, attack, map, ctx.cellFeet)
            ],
        },
        { key: 'targetSurprised', sl: surprisedRangedSl(target, edition) },
        { key: 'cover', sl: ctx.obstacle ? COVER_SL : 0 },
        {
            key: 'targetProneRanged',
            sl: ctx.obstacle ? 0 : proneTargetRangedSl(target, edition),
        },
        { key: 'aim', sl: aimedAt(attacker, target) ? AIM_SL : 0 },
        {
            key: 'moved',
            sl: (attacker.battleData.movementUsed ?? 0) > 0 ? MOVED_SL : 0,
        },
        { key: 'weather', sl: weatherSl(map) },
        { key: 'intoMelee', sl: 0, ...(intoMelee && { disadvantage: 1 }) },
    ]);
}

export const sumAttackMods = (mods: AttackMod[]): number =>
    mods.reduce((sum, m) => sum + m.sl, 0);

export const sumDisadvantage = (mods: AttackMod[]): number =>
    mods.reduce((sum, m) => sum + (m.disadvantage ?? 0), 0);
