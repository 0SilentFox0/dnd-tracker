import { skillTarget } from '../characteristics/derive';
import type { Characteristics } from '../characteristics/keys';

import { dynamicTextRef, joinLines, textRef } from '@/lib/i18n/text-ref';
import type { LogLine } from '@/types/text';

const GROUP_SPEC: Record<string, string> = { twohanded: 'two-handed' };

/** "Melee (Basic)" for the weapon group's skill; only meaningful when `weaponSkillTarget` found one */
export const weaponSkillLabel = (
    kind: 'melee' | 'ranged',
    group: string | undefined
): LogLine =>
    joinLines([
        textRef(`gameTerms.wfrpSkills.${kind}`),
        ' (',
        dynamicTextRef(
            `gameTerms.wfrpSpecs.${kind}.${GROUP_SPEC[group ?? ''] ?? group}`
        ),
        ')',
    ]);

/** Melee (group) / Ranged (group) target of a weapon group; `undefined` when the group maps to no skill. */
export function weaponSkillTarget(
    c: Characteristics,
    kind: 'melee' | 'ranged',
    group: string | undefined
): number | undefined {
    if (!group) return undefined;

    return skillTarget(c, kind, GROUP_SPEC[group] ?? group)?.target;
}
