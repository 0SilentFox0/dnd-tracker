import type { RichNode, ScenarioContent } from "@/types/scenario";

export interface FilledImages { content: ScenarioContent; found: Set<string>; changed: boolean }

export function fillImageSources(content: ScenarioContent, urls: ReadonlyMap<string, string>): FilledImages {
  const found = new Set<string>();

  let changed = false;

  const visit = (node: RichNode): RichNode => {
    let next = node;

    const mediaId = node.type === "image" ? node.attrs?.mediaId : undefined;

    if (typeof mediaId === "string") {
      found.add(mediaId);

      const url = urls.get(mediaId);

      if (url && !node.attrs?.src) {
        next = { ...next, attrs: { ...node.attrs, src: url } };
        changed = true;
      }
    }

    if (node.content) next = { ...next, content: node.content.map(visit) };

    return next;
  };

  const sections = content.sections.map((section) => ({
    ...section,
    rows: section.rows.map((row) => ({
      ...row,
      story: { ...row.story, content: row.story.content.map(visit) },
      notes: { ...row.notes, content: row.notes.content.map(visit) },
    })),
  }));

  return { content: { ...content, sections }, found, changed };
}
