import { compareUk } from "@/lib/utils/common/text";
import type { ScenarioIndexGroups, ScenarioPageSummary } from "@/types/scenario";

const bySort = (a: ScenarioPageSummary, b: ScenarioPageSummary) => a.sortOrder - b.sortOrder || compareUk(a.title, b.title);

export function groupIndex(pages: ScenarioPageSummary[]): ScenarioIndexGroups {
  const scenes = pages.filter((p) => p.kind === "scene").sort(bySort);

  const arcs = new Map<string, ScenarioIndexGroups["arcs"][number]>();

  scenes.forEach((page, i) => {
    const arc = page.arc?.trim() || "";

    if (!arcs.has(arc)) arcs.set(arc, { arc, pages: [] });

    arcs.get(arc)?.pages.push({ ...page, number: i + 1 });
  });

  return {
    arcs: [...arcs.values()],
    heroes: pages.filter((p) => p.kind === "hero").sort(bySort),
    notes: pages.filter((p) => p.kind === "note").sort(bySort),
  };
}
