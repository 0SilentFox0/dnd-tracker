import type { useTranslations } from 'next-intl';

import type gameTerms from '@/messages/uk/gameTerms.json';
import { skillDef } from '@/systems/wfrp/rules/skills/catalog';

export type GameTermsT = ReturnType<typeof useTranslations<'gameTerms'>>;

type SkillName = keyof typeof gameTerms.wfrpSkills;

export const skillName = (tg: GameTermsT, key: string) =>
    tg(`wfrpSkills.${key as SkillName}`);

export const specName = (tg: GameTermsT, key: string, spec: string) =>
    tg(
        `wfrpSpecs.${key}.${spec}` as `wfrpSpecs.melee.${keyof typeof gameTerms.wfrpSpecs.melee}`
    );

export function skillLabel(tg: GameTermsT, key: string, spec?: string): string {
    const name = skillName(tg, key);

    if (!spec) return name;

    return `${name} (${skillDef(key)?.spec === 'fixed' ? specName(tg, key, spec) : spec})`;
}
