import { compareUk } from '@/lib/utils/common/text';
import type {
    ScenarioIndexGroups,
    ScenarioPageSummary,
} from '@/types/scenario';

const bySort = (a: ScenarioPageSummary, b: ScenarioPageSummary) =>
    a.sortOrder - b.sortOrder || compareUk(a.title, b.title);

// scene numbers always run over the full list; `visible` only narrows what is shown
export function groupIndex(
    pages: ScenarioPageSummary[],
    visible?: ReadonlySet<string>
): ScenarioIndexGroups {
    const shown = (p: ScenarioPageSummary) => !visible || visible.has(p.id);

    const scenes = pages.filter((p) => p.kind === 'scene').sort(bySort);

    const arcs = new Map<string, ScenarioIndexGroups['arcs'][number]>();

    scenes.forEach((page, i) => {
        if (!shown(page)) return;

        const arc = page.arc?.trim() || '';

        if (!arcs.has(arc)) arcs.set(arc, { arc, pages: [] });

        arcs.get(arc)?.pages.push({ ...page, number: i + 1 });
    });

    return {
        arcs: [...arcs.values()],
        heroes: pages.filter((p) => p.kind === 'hero' && shown(p)).sort(bySort),
        notes: pages.filter((p) => p.kind === 'note' && shown(p)).sort(bySort),
    };
}
