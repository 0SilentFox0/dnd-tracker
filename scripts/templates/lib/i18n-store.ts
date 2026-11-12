import * as fs from 'fs';
import * as path from 'path';

import { packPath, TEMPLATES_DIR } from './pack';

import type { TranslationsV2 } from '@/lib/utils/templates/i18n/keys';

const i18nDir = (key: string, dir: string) => packPath(key, 'i18n', dir);

const translationsFile = (key: string, locale: string, dir: string) =>
    path.join(i18nDir(key, dir), `${locale}.json`);

export const hasTranslations = (
    key: string,
    locale: string,
    dir = TEMPLATES_DIR
): boolean => fs.existsSync(translationsFile(key, locale, dir));

export function readTranslations(
    key: string,
    locale: string,
    dir = TEMPLATES_DIR
): TranslationsV2 {
    const file = translationsFile(key, locale, dir);

    return fs.existsSync(file)
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as TranslationsV2)
        : {};
}

/** Sorted keys, one entry per line, so diffs and merges stay line-based. */
export function writeTranslations(
    key: string,
    locale: string,
    tr: TranslationsV2,
    dir = TEMPLATES_DIR
): void {
    fs.mkdirSync(i18nDir(key, dir), { recursive: true });

    const lines = Object.keys(tr)
        .sort()
        .map(
            (entryKey) =>
                `  ${JSON.stringify(entryKey)}: ${JSON.stringify({ text: tr[entryKey].text, en: tr[entryKey].en })}`
        );

    fs.writeFileSync(
        translationsFile(key, locale, dir),
        lines.length ? `{\n${lines.join(',\n')}\n}\n` : '{}\n'
    );
}

export const readGlossary = (
    key: string,
    locale: string,
    dir = TEMPLATES_DIR
): Record<string, string> => {
    const file = path.join(i18nDir(key, dir), 'glossary', `${locale}.json`);

    return fs.existsSync(file)
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>)
        : {};
};
