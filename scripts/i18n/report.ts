#!/usr/bin/env tsx
// pnpm i18n:report [--json] [--list <locale|template>] [--strict] — missing keys per locale/file vs the English base
import * as fs from 'fs';
import * as path from 'path';

import { catalogOf } from '../templates/lib/i18n-convert';
import { readTranslations } from '../templates/lib/i18n-store';
import { listPackKeys, packPath } from '../templates/lib/pack';
import {
    compareKeys,
    type Comparison,
    flatten,
    formatTable,
    percentOf,
    topPrefixes,
} from './report-core';

import { statusOf } from '@/lib/utils/templates/i18n/keys';

const MESSAGES = path.join(process.cwd(), 'messages');

const BASE = 'en';

interface Row extends Comparison {
    source: 'messages' | 'template';
    locale: string;
    unit: string;
    stale: string[];
}

const readJson = (file: string) =>
    JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;

const dirs = (dir: string) =>
    fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

function messageRows(): Row[] {
    const files = fs
        .readdirSync(path.join(MESSAGES, BASE))
        .filter((f) => f.endsWith('.json'))
        .sort();

    return dirs(MESSAGES)
        .filter((locale) => locale !== BASE)
        .flatMap((locale) => {
            const own = new Set(
                fs
                    .readdirSync(path.join(MESSAGES, locale))
                    .filter((f) => f.endsWith('.json'))
            );

            return [...new Set([...files, ...own])].sort().map((file) => {
                const read = (l: string) =>
                    fs.existsSync(path.join(MESSAGES, l, file))
                        ? flatten(readJson(path.join(MESSAGES, l, file)))
                        : {};

                const base = read(BASE);

                return {
                    source: 'messages' as const,
                    locale,
                    unit: file.replace(/\.json$/, ''),
                    stale: [],
                    ...compareKeys(Object.keys(base), read(locale)),
                };
            });
        });
}

function templateRows(): Row[] {
    return listPackKeys().flatMap((template) => {
        const i18n = packPath(template, 'i18n');

        if (!fs.existsSync(i18n)) return [];

        const locales = fs
            .readdirSync(i18n)
            .filter((f) => f.endsWith('.json'))
            .map((f) => f.replace(/\.json$/, ''));

        if (locales.length === 0) return [];

        const catalog = catalogOf(template);

        return locales.map((locale) => {
            const tr = readTranslations(template, locale);

            const status = statusOf(catalog, tr);

            return {
                source: 'template' as const,
                locale,
                unit: template,
                stale: status.stale,
                ...compareKeys(
                    catalog.map((e) => e.key),
                    Object.fromEntries(
                        Object.entries(tr).map(([k, v]) => [k, v.text])
                    )
                ),
            };
        });
    });
}

const totals = (rows: Row[]) => {
    const total = rows.reduce((n, r) => n + r.total, 0);

    const present = rows.reduce((n, r) => n + r.present, 0);

    return { total, present, missing: total - present };
};

function printSource(
    title: string,
    rows: Row[],
    separator: string,
    depth: number
) {
    console.info(`\n== ${title} ==`);

    for (const locale of [...new Set(rows.map((r) => r.locale))]) {
        const own = rows.filter((r) => r.locale === locale);

        const sum = totals(own);

        console.info(
            `\n[${locale}] base ${sum.total}, present ${sum.present}, MISSING ${sum.missing} (${percentOf(sum.present, sum.total)}%), orphans ${own.reduce((n, r) => n + r.orphans.length, 0)}, empty ${own.reduce((n, r) => n + r.empty.length, 0)}, stale ${own.reduce((n, r) => n + r.stale.length, 0)}`
        );

        const worst = own
            .filter(
                (r) =>
                    r.missing.length > 0 ||
                    r.orphans.length > 0 ||
                    r.empty.length > 0 ||
                    r.stale.length > 0
            )
            .sort((a, b) => b.missing.length - a.missing.length)
            .slice(0, 15);

        if (worst.length === 0) continue;

        console.info(
            formatTable([
                [
                    'unit',
                    'base',
                    'present',
                    'missing',
                    '%',
                    'orphan',
                    'empty',
                    'stale',
                ],
                ...worst.map((r) => [
                    r.unit,
                    String(r.total),
                    String(r.present),
                    String(r.missing.length),
                    String(percentOf(r.present, r.total)),
                    String(r.orphans.length),
                    String(r.empty.length),
                    String(r.stale.length),
                ]),
            ])
        );

        const prefixes = topPrefixes(
            own.flatMap((r) =>
                r.missing.map((k) => `${r.unit}${separator}${k}`)
            ),
            depth,
            8,
            separator
        );

        if (prefixes.length > 0)
            console.info(
                `top missing prefixes: ${prefixes.map(([p, n]) => `${p} (${n})`).join(', ')}`
            );
    }
}

function main() {
    const args = process.argv.slice(2);

    const rows = { messages: messageRows(), templates: templateRows() };

    const all = [...rows.messages, ...rows.templates];

    if (args.includes('--json')) {
        console.info(JSON.stringify(all, null, 2));
    } else if (args.includes('--list')) {
        const target = args[args.indexOf('--list') + 1];

        const hit = all.filter(
            (r) =>
                r.locale === target ||
                (r.source === 'template' && r.unit === target)
        );

        for (const r of hit)
            for (const key of r.missing)
                console.info(`${r.source}:${r.unit}:${r.locale}\t${key}`);
    } else {
        printSource('app messages (base en)', rows.messages, '.', 2);
        printSource(
            'template dictionaries (base: English catalog)',
            rows.templates,
            '/',
            2
        );
    }

    if (
        args.includes('--strict') &&
        all.some(
            (r) =>
                r.missing.length > 0 ||
                r.orphans.length > 0 ||
                r.empty.length > 0
        )
    )
        process.exitCode = 1;
}

main();
