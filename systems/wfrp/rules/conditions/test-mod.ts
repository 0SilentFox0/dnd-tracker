import type { EditionProfile } from '../edition';
import type { ModeSources } from '../percentile/advantage';
import { wfrpState } from '../state';
import { WFRP_CONDITION_KEYS, WFRP_CONDITION_REGISTRY } from './catalog';
import { conditionLevel } from './levels';

import type { BattleParticipant } from '@/types/battle';

type Model = Pick<EditionProfile, 'conditionModel'>;

const SURPRISED_MELEE_SL = 2;

const ENTANGLED_MOVEMENT_SL = -1;

const SIGHT_SKILLS: ReadonlySet<string> = new Set(['climb', 'ride']);

const levelsOf = (p: BattleParticipant | undefined) =>
    p?.battleData?.activeEffects
        ? WFRP_CONDITION_KEYS.map((key) => ({
              key,
              level: conditionLevel(p, key),
          })).filter((c) => c.level > 0)
        : [];

const isSl = (edition: Model) => edition.conditionModel === 'sl';

const OOPS_SL = -1;

/** Oops result 5-6 (p165): -1 SL to every test for the round after the fumble */
const oopsPenalised = (p: BattleParticipant | undefined) =>
    !!p && wfrpState(p).oopsPenalty === 'now';

/** Percent shift of the target (legacy model); zero under the `sl` model, see `selfSlMod` */
export function selfTestMod(
    p: BattleParticipant | undefined,
    kind: 'attack' | 'test',
    edition: Model
): number {
    if (isSl(edition)) return 0;

    return levelsOf(p).reduce((sum, { key, level }) => {
        const mod = WFRP_CONDITION_REGISTRY[key].testMod;

        return (
            sum +
            (mod?.self?.(level) ?? 0) +
            (kind === 'attack' ? (mod?.selfAttack ?? 0) : 0)
        );
    }, 0);
}

/** SL cost of the worst penalising condition (p184-186): different conditions do not add */
export function selfSlMod(
    p: BattleParticipant | undefined,
    edition: Model
): number {
    if (!isSl(edition)) return 0;

    const worst = levelsOf(p).reduce(
        (max, { key, level }) =>
            WFRP_CONDITION_REGISTRY[key].slPenalty ? Math.max(max, level) : max,
        0
    );

    return (worst > 0 ? -worst : 0) + (oopsPenalised(p) ? OOPS_SL : 0);
}

/** Entangled: -1 SL on actions that involve movement, e.g. Disengage and Sprint (p186); other tests are untouched */
export const movementSlMod = (
    p: BattleParticipant | undefined,
    edition: Model
): number =>
    isSl(edition) && levelsOf(p).some((c) => c.key === 'entangled')
        ? ENTANGLED_MOVEMENT_SL
        : 0;

/** Blinded: Disadvantage to attacks and to tests that lean on sight, e.g. Climb or Ride (p185) */
export function selfModes(
    p: BattleParticipant | undefined,
    kind: 'attack' | 'test',
    edition: Model,
    skill?: string
): ModeSources {
    const sighted =
        kind === 'attack' || (!!skill && SIGHT_SKILLS.has(skill));

    return isSl(edition) &&
        sighted &&
        levelsOf(p).some((c) => c.key === 'blinded')
        ? { disadvantage: 1 }
        : {};
}

export function againstMod(
    target: BattleParticipant,
    attackKind: 'melee' | 'ranged',
    edition: Model
): number {
    if (isSl(edition)) return 0;

    return levelsOf(target).reduce((sum, { key }) => {
        const against = WFRP_CONDITION_REGISTRY[key].testMod?.against;

        return (
            sum +
            (against?.all ?? 0) +
            (attackKind === 'melee' ? (against?.melee ?? 0) : 0)
        );
    }, 0);
}

/** A Surprised fighter cannot defend in opposed tests (p187) */
export const cannotDefend = (
    p: BattleParticipant | undefined,
    edition: Model
): boolean => isSl(edition) && levelsOf(p).some((c) => c.key === 'surprised');

/** Prone and Blinded give melee attackers Advantage, Surprised +2 SL (p185-187); ranged attacks are unaffected */
export function againstSl(
    target: BattleParticipant,
    attackKind: 'melee' | 'ranged',
    edition: Model
): { advantage: number; sl: number } {
    if (!isSl(edition) || attackKind !== 'melee') return { advantage: 0, sl: 0 };

    const keys = levelsOf(target).map((c) => c.key);

    return {
        advantage:
            Number(keys.includes('prone')) + Number(keys.includes('blinded')),
        sl: keys.includes('surprised') ? SURPRISED_MELEE_SL : 0,
    };
}
