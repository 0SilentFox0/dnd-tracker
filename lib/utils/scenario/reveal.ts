import { isDocEmpty, stripSecrets } from "./doc";

import type { ScenarioContent, ScenarioSection, StoryChapter } from "@/types/scenario";

export type PlayedLookup = (pageId: string, sectionId: string) => boolean;

export function revealTargets(sections: ScenarioSection[]): { pageId: string; sectionId: string }[] {
  return sections.flatMap((s) => (s.reveal?.mode === "afterSection" ? [{ pageId: s.reveal.pageId, sectionId: s.reveal.sectionId }] : []));
}

export function playedLookup(pages: { id: string; played: string[] }[]): PlayedLookup {
  const byPage = new Map(pages.map((p) => [p.id, new Set(p.played)]));

  return (pageId, sectionId) => byPage.get(pageId)?.has(sectionId) ?? false;
}

export function isChapterOpen(section: ScenarioSection, played: PlayedLookup): boolean {
  if (section.revealedAt) return true;

  return section.reveal?.mode === "afterSection" && played(section.reveal.pageId, section.reveal.sectionId);
}

export function openChapters(content: ScenarioContent, played: PlayedLookup): StoryChapter[] {
  return content.sections
    .filter((s) => isChapterOpen(s, played))
    .map((s) => ({ id: s.id, title: s.title, rows: s.rows.map((r) => stripSecrets(r.story)).filter((d) => !isDocEmpty(d)) }));
}

/** Зіграний розділ сцени або відкрита глава героя — те саме правило для кнопки, змісту і згортання. */
export function sectionDone(section: ScenarioSection, isHero: boolean, played?: PlayedLookup): { done: boolean; byPlay: boolean } {
  if (!isHero) return { done: section.played, byPlay: false };

  const byPlay = !section.revealedAt && !!played && isChapterOpen(section, played);

  return { done: !!section.revealedAt || byPlay, byPlay };
}
