import { createHash } from 'crypto';

import { PACK_HOOKS } from '../systems';
import { type Pack, readPack, TEMPLATES_DIR } from './pack';

import type { TextClass } from '@/lib/utils/templates/i18n/catalog';
import {
    extractKeyed,
    type KeyedString,
    rulesKeyed,
    type TranslationsV2,
} from '@/lib/utils/templates/i18n/keys';

export const hashText = (cls: TextClass, en: string) =>
    createHash('sha1').update(`${cls}\0${en}`).digest('hex').slice(0, 10);

export function catalogOfPack(pack: Pack): KeyedString[] {
    const rows =
        PACK_HOOKS[pack.manifest.system]?.i18nRows?.(pack) ?? pack.rows;

    return [
        ...extractKeyed(rows, Object.keys(rows)),
        ...rulesKeyed(pack.rules),
    ];
}

export const catalogOf = (key: string, dir = TEMPLATES_DIR): KeyedString[] =>
    catalogOfPack(readPack(key, dir));

export const i18nIssuesOf = (pack: Pack, tr: TranslationsV2): string[] =>
    PACK_HOOKS[pack.manifest.system]?.i18nIssues?.(pack, tr) ?? [];

/** Every v1 hash fans out to all catalog keys with that class and English text. */
export function convertV1(
    catalog: readonly KeyedString[],
    v1: Record<string, string>
): { v2: TranslationsV2; unmatched: string[] } {
    const v2: TranslationsV2 = {};

    const used = new Set<string>();

    for (const entry of catalog) {
        const hash = hashText(entry.cls, entry.en);

        if (Object.hasOwn(v1, hash)) {
            v2[entry.key] = { text: v1[hash], en: entry.en };
            used.add(hash);
        }
    }

    return { v2, unmatched: Object.keys(v1).filter((hash) => !used.has(hash)) };
}
