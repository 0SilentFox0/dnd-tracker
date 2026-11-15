import { isRecord } from '@/lib/utils/common/is-record';
import { sectionSchemas } from '@/lib/utils/rules/section-shapes';
import { PRESETS } from '@/lib/utils/rules/systems/catalog';
import {
    FALLBACK_BASE,
    isD20Preset,
    NEW_MODULES,
    type RulesRow,
} from '@/scripts/db/lib/backfill-rule-modules-plan';

export interface Counts {
    empty: number;
    partial: number;
    full: number;
}

export interface ModulesReport {
    rows: number;
    explicit: number;
    incomplete: number;
    groups: Record<'campaigns' | 'battle_scenes' | 'activeScenes', Counts>;
}

const bucketOf = (modules: readonly string[]): keyof Counts => {
    if (modules.length === 0) return 'empty';

    return NEW_MODULES.every((id) => modules.includes(id)) ? 'full' : 'partial';
};

const explicitModules = (text: string) => {
    let raw: unknown;

    try {
        raw = JSON.parse(text);
    } catch {
        return null;
    }

    const system = isRecord(raw)
        ? sectionSchemas.system.safeParse(raw.system)
        : undefined;

    if (!system?.success || !system.data.modules) return null;

    const { key, modules } = system.data;

    return PRESETS[key]?.base === FALLBACK_BASE ? { key, modules } : null;
};

export function reportRows(rows: readonly RulesRow[]): ModulesReport {
    const zero = (): Counts => ({ empty: 0, partial: 0, full: 0 });

    const report: ModulesReport = {
        rows: rows.length,
        explicit: 0,
        incomplete: 0,
        groups: {
            campaigns: zero(),
            battle_scenes: zero(),
            activeScenes: zero(),
        },
    };

    for (const row of rows) {
        const found = explicitModules(row.text);

        if (!found) continue;

        const bucket = bucketOf(found.modules);

        report.explicit++;
        report.groups[row.table][bucket]++;

        if (row.status === 'active') report.groups.activeScenes[bucket]++;

        if (bucket !== 'full' && isD20Preset(found.key)) report.incomplete++;
    }

    return report;
}
