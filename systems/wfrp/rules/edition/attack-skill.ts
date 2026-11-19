import { skillTarget } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';

const GROUP_SPEC: Record<string, string> = { twohanded: 'two-handed' };

/** Melee (group) / Ranged (group) target of a weapon group; `undefined` when the group maps to no skill. */
export function weaponSkillTarget(
    c: Characteristics,
    kind: 'melee' | 'ranged',
    group: string | undefined
): number | undefined {
    if (!group) return undefined;

    return skillTarget(c, kind, GROUP_SPEC[group] ?? group)?.target;
}
