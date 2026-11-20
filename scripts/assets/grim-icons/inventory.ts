#!/usr/bin/env tsx
// pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/grim-icons/inventory.ts [--template grim-d100] [--json] [--missing] [--ui]
import * as path from 'path';

import { readIconsFile } from '../../templates/lib/icons-file';
import { readPack, TEMPLATES_DIR } from '../../templates/lib/pack';
import { WFRP_ROW_KINDS } from '../../templates/systems/wfrp/common';

import { WFRP_CONDITION_KEYS } from '@/systems/wfrp/constants/conditions';
import {
    PASSION_KINDS,
    PSYCHOLOGY_KINDS,
    TRAIT_SIZES,
} from '@/systems/wfrp/rules/trait-kinds';

interface KindReport {
    kind: string;
    rows: number;
    withIcon: number;
    missing: string[];
    orphans: string[];
}

const args = process.argv.slice(2);

const flag = (name: string) => args.includes(name);

const templateIdx = args.indexOf('--template');

const template = templateIdx >= 0 ? args[templateIdx + 1] : 'grim-d100';

const UI_ICONS: Record<string, readonly string[]> = {
    conditions: WFRP_CONDITION_KEYS,
    sizes: TRAIT_SIZES,
    psychology: PSYCHOLOGY_KINDS,
    passions: PASSION_KINDS,
    resources: [
        'advantage',
        'momentum',
        'fate',
        'fortune',
        'resilience',
        'resolve',
        'corruption',
        'sin',
    ],
    hitLocations: [
        'head',
        'left-arm',
        'right-arm',
        'body',
        'left-leg',
        'right-leg',
    ],
    testOutcomes: [
        'critical-success',
        'critical-failure',
        'fumble',
        'wrath',
        'miscast',
    ],
    hero: [
        'status-brass',
        'status-silver',
        'status-gold',
        'endeavour',
        'career-tick',
    ],
};

function inventory(): KindReport[] {
    const pack = readPack(template);

    const icons = readIconsFile(
        path.join(TEMPLATES_DIR, template, 'icons.json')
    );

    return WFRP_ROW_KINDS.map((kind) => {
        const slugs = (pack.rows[kind] ?? []).map((row) => String(row.slug));

        const have = icons[kind] ?? {};

        return {
            kind,
            rows: slugs.length,
            withIcon: slugs.filter((s) => have[s]).length,
            missing: slugs.filter((s) => !have[s]),
            orphans: Object.keys(have).filter((s) => !slugs.includes(s)),
        };
    });
}

function main() {
    if (flag('--ui')) {
        const total = Object.values(UI_ICONS).reduce((n, v) => n + v.length, 0);

        console.log(
            flag('--json')
                ? JSON.stringify(UI_ICONS, null, 2)
                : `UI icons: ${total}\n${Object.entries(UI_ICONS)
                      .map(([g, v]) => `${g} (${v.length}): ${v.join(', ')}`)
                      .join('\n')}`
        );

        return;
    }

    const report = inventory();

    if (flag('--json')) {
        console.log(JSON.stringify(report, null, 2));

        return;
    }

    console.log(`Template ${template}`);
    console.log('kind        rows  icon  missing  orphans');

    for (const r of report)
        console.log(
            `${r.kind.padEnd(10)} ${String(r.rows).padStart(5)} ${String(r.withIcon).padStart(5)} ${String(r.missing.length).padStart(8)} ${String(r.orphans.length).padStart(8)}`
        );

    const totalMissing = report.reduce((n, r) => n + r.missing.length, 0);

    console.log(`Total missing: ${totalMissing}`);

    if (flag('--missing'))
        for (const r of report)
            if (r.missing.length)
                console.log(`\n${r.kind}:\n  ${r.missing.join('\n  ')}`);
}

main();
