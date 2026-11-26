import { readFileSync } from 'node:fs';

import { CAMPAIGN_BASE } from '../route-scopes';
import { ROOT_NAMESPACES } from '../scopes';
import { campaignPages, collectUses, type NsUse, reach, routeGraph } from './route-namespaces';
import { slotFilesOf } from './system-slots';

import { composition } from '@/lib/utils/rules/systems/catalog';
import { SYSTEM_META } from '@/lib/utils/rules/systems/meta';

export const ALWAYS_CORE = new Set<string>([
    ...CAMPAIGN_BASE,
    ...ROOT_NAMESPACES,
    'whatsNew',
    'demoTours',
]);

const HOST_IMPORT =
    /systemUiOf|systemUiByKey|SystemDmPage|useSystemBattleUi|useSystemFx/;

const NON_SLOTS = new Set(['uiIcons', 'hideProgression', 'resourceDefaults']);

const isRegistryFile = (file: string) =>
    file.startsWith('components/systems/') ||
    file.startsWith('lib/utils/rules/systems/');

const SECTION = /<SystemDmPage[\s\S]*?section=(?:["']([\w-]+)["']|\{)/;

export interface Entry {
    key: string;
    moduleIds: string[];
}

export const ENTRIES: Entry[] = SYSTEM_META.flatMap((meta) =>
    meta.keys.map((key) => key as string)
).flatMap((key) => {
    try {
        const { base, modules } = composition({ key });

        return [{ key, moduleIds: [base, ...modules] }];
    } catch {
        return [];
    }
});

export const PAGES = campaignPages();

export const GRAPHS = new Map(PAGES.map((page) => [page, routeGraph(page)]));

const hostFiles = (files: ReadonlySet<string>) =>
    [...files].filter(
        (f) => !f.startsWith('systems/') && !isRegistryFile(f)
    );

const textOf = (file: string) => readFileSync(file, 'utf8');

/** Slot components a page's core graph can render for one system, as `slot -> files`. */
export const renderedSlots = (
    page: string,
    moduleIds: readonly string[]
): Map<string, { moduleId: string; files: string[] }> => {
    const g = GRAPHS.get(page)!;

    const hosts = hostFiles(g.files).map((f) => ({ f, text: textOf(f) }));

    const out = new Map<string, { moduleId: string; files: string[] }>();

    for (const moduleId of moduleIds) {
        const { slots, dmPages } = slotFilesOf(moduleId);

        for (const [slot, files] of slots) {
            if (NON_SLOTS.has(slot) || files.length === 0) continue;

            const re = new RegExp(`\\b${slot}\\b`);

            const battleOnly = slot === 'battle' || slot === 'fx';

            const hit = hosts.some(
                ({ text }) =>
                    (battleOnly
                        ? /useSystemBattleUi|useSystemFx|use-system-battle-ui/.test(text)
                        : HOST_IMPORT.test(text)) && re.test(text)
            );

            if (hit) out.set(`${moduleId}.${slot}`, { moduleId, files });
        }

        for (const [section, files] of dmPages) {
            const dynamic = hosts.some(
                ({ f, text }) =>
                    f === page && /<SystemDmPage/.test(text) && !SECTION.exec(text)?.[1]
            );

            const sections = hosts
                .filter(({ f }) => f === page)
                .map(({ text }) => SECTION.exec(text)?.[1])
                .filter(Boolean);

            if (dynamic || sections.includes(section))
                out.set(`${moduleId}.dmPages.${section}`, { moduleId, files });
        }
    }

    return out;
};


/** Namespace reads of the system components a page can render for one system composition. */
export const systemReads = (
    page: string,
    moduleIds: readonly string[]
): (NsUse & { slot: string })[] => {
    const out: (NsUse & { slot: string })[] = [];

    for (const [slot, { moduleId, files }] of renderedSlots(page, moduleIds)) {
        const reached = reach(files, false, undefined, {
            mode: 'client',
            skip: (f) =>
                isRegistryFile(f) ||
                (f.startsWith('systems/') && !f.startsWith(`systems/${moduleId}/`)),
        });

        for (const u of collectUses([...reached.keys()])) out.push({ ...u, slot });
    }

    return out;
};
