import { defineSpec, type FieldDef, nameField, textField } from './common';

import {
    CAREER_TIER_COUNT,
    CAREER_TIER_PARTS,
    careerTierKey,
    type CareerTierPart,
} from '@/lib/constants/import-aliases';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import type { ImportRecord } from '@/types/content-import';

const tiers = Array.from({ length: CAREER_TIER_COUNT }, (_, i) => i + 1);

const partField = (n: number, part: CareerTierPart): FieldDef => {
    const key = careerTierKey(n, part);

    if (part === 'name' || part === 'status') return textField(key);

    if (part === 'talents')
        return { key, type: 'refList', ref: 'feats', strictRef: true };

    return part === 'characteristics'
        ? { key, type: 'list', enumValues: CHARACTERISTIC_KEYS }
        : { key, type: 'list' };
};

export const CAREERS_IMPORT = defineSpec({
    kind: 'careers',
    fields: [
        nameField(),
        textField('icon'),
        textField('class'),
        ...tiers.flatMap((n) =>
            CAREER_TIER_PARTS.map((part) => partField(n, part))
        ),
    ],
    toBody: (record) => {
        const body: ImportRecord = { ...record };

        const out: Array<Record<string, unknown>> = [];

        for (const n of tiers) {
            const get = (part: CareerTierPart) =>
                record[careerTierKey(n, part)];

            for (const part of CAREER_TIER_PARTS)
                delete body[careerTierKey(n, part)];

            if (CAREER_TIER_PARTS.every((part) => get(part) === undefined))
                continue;

            out.push({
                name: get('name'),
                ...(get('status') !== undefined && { status: get('status') }),
                characteristics: get('characteristics') ?? [],
                skills: get('skills') ?? [],
                talents: get('talents') ?? [],
                trappings: get('trappings') ?? [],
            });
        }

        return out.length > 0 ? { ...body, tiers: out } : body;
    },
});
