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

    const children = node.content;

    if (children) {
      const content = children.map(visit);

      if (content.some((child, i) => child !== children[i])) next = { ...next, content };
    }

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

  return { content: changed ? { ...content, sections } : content, found, changed };
}
