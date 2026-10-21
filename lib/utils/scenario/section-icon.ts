import { SECTION_ICON_KEYS } from "@/lib/constants/scenario";
import type { RichNode, ScenarioSection, SectionIconKey } from "@/types/scenario";

function hasCallout(nodes: RichNode[] | undefined, kinds: readonly string[]): boolean {
  return (nodes ?? []).some((n) => (n.type === "callout" && kinds.includes(String(n.attrs?.kind))) || hasCallout(n.content, kinds));
}

const storyHas = (section: ScenarioSection, kinds: readonly string[]) => section.rows.some((r) => hasCallout(r.story.content, kinds));

export function sectionIcon(section: ScenarioSection): SectionIconKey {
  if (section.icon && (SECTION_ICON_KEYS as readonly string[]).includes(section.icon)) return section.icon;

  if (/^підготов/i.test(section.title.trim())) return "prep";

  if (section.rows.some((r) => r.battleId)) return "battle";

  if (storyHas(section, ["shadow", "confide"])) return "secret";

  if (storyHas(section, ["choice"])) return "choice";

  return "scene";
}
