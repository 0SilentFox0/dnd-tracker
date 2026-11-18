import type { Examples, PerField } from '../types';
import * as artifactSets from './artifact-sets';
import * as artifacts from './artifacts';
import * as backgrounds from './backgrounds';
import * as careers from './careers';
import * as classes from './classes';
import * as feats from './feats';
import * as mainSkills from './main-skills';
import * as races from './races';
import * as skills from './skills';
import * as spellGroups from './spell-groups';
import * as spells from './spells';
import * as units from './units';

import type { Locale } from '@/lib/i18n/config';
import type { ImportKind } from '@/types/content-import';

const KINDS = {
    units: units,
    spells: spells,
    skills: skills,
    'main-skills': mainSkills,
    'spell-groups': spellGroups,
    races: races,
    classes: classes,
    feats: feats,
    backgrounds: backgrounds,
    careers: careers,
    artifacts: artifacts,
    'artifact-sets': artifactSets,
} as const satisfies Record<ImportKind, unknown>;

const pick = <T>(
    get: (m: (typeof KINDS)[ImportKind]) => T
): Record<ImportKind, T> =>
    Object.fromEntries(
        (Object.keys(KINDS) as ImportKind[]).map((k) => [k, get(KINDS[k])])
    ) as Record<ImportKind, T>;

// header aliases per field: Ukrainian and English column names accepted by the CSV import (the field key itself always matches)
export const FIELD_ALIASES: Record<
    ImportKind,
    PerField<readonly string[]>
> = pick((m) => m.fieldAliases);

export const NEUTRAL: Examples = pick((m) => m.neutralExamples);

export const LOCALIZED: Record<Locale, Examples> = {
    uk: pick((m) => m.ukExamples),
    en: pick((m) => m.enExamples),
};
