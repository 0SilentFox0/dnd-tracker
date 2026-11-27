import type { ScenarioPageSummary } from '@/types/scenario';

export interface ScenarioIndexStats {
    total: number;
    scenes: number;
    ready: number;
    played: number;
}

export function filterPages(
    pages: ScenarioPageSummary[],
    query: string
): ScenarioPageSummary[] {
    const needle = query.trim().toLocaleLowerCase();

    if (!needle) return pages;

    return pages.filter((p) =>
        [p.title, p.subtitle, p.arc].some((s) =>
            s?.toLocaleLowerCase().includes(needle)
        )
    );
}

export function indexStats(pages: ScenarioPageSummary[]): ScenarioIndexStats {
    return {
        total: pages.length,
        scenes: pages.filter((p) => p.kind === 'scene').length,
        ready: pages.filter((p) => p.status === 'ready').length,
        played: pages.filter((p) => p.status === 'played').length,
    };
}
