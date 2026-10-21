import { EMPTY_DOC } from "./doc";

import type { ScenarioContent, ScenarioRow, ScenarioRowSlide, ScenarioSection } from "@/types/scenario";

export const newId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 10);

export const emptyContent = (): ScenarioContent => ({ legend: [], sections: [] });

export const newRow = (): ScenarioRow => ({ id: newId(), story: EMPTY_DOC, notes: EMPTY_DOC });

export const newSection = (title: string): ScenarioSection => ({ id: newId(), title, played: false, rows: [newRow()] });

const move = <T extends { id: string }>(list: T[], id: string, dir: -1 | 1): T[] | null => {
  const from = list.findIndex((x) => x.id === id);

  const to = from + dir;

  if (from < 0 || to < 0 || to >= list.length) return null;

  const next = [...list];

  [next[from], next[to]] = [next[to], next[from]];

  return next;
};

const mapSection = (c: ScenarioContent, sectionId: string, fn: (s: ScenarioSection) => ScenarioSection): ScenarioContent => ({
  ...c,
  sections: c.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
});

export const pickLiveSection = (c: ScenarioContent): ScenarioSection | null => c.sections.find((s) => !s.played) ?? null;

export const addSection = (c: ScenarioContent, title: string): ScenarioContent => ({ ...c, sections: [...c.sections, newSection(title)] });

export const updateSection = (c: ScenarioContent, sectionId: string, patch: Partial<Omit<ScenarioSection, "id" | "rows">>): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, ...patch }));

export const removeSection = (c: ScenarioContent, sectionId: string): ScenarioContent => ({ ...c, sections: c.sections.filter((s) => s.id !== sectionId) });

export function moveSection(c: ScenarioContent, sectionId: string, dir: -1 | 1): ScenarioContent {
  const sections = move(c.sections, sectionId, dir);

  return sections ? { ...c, sections } : c;
}

export const addRow = (c: ScenarioContent, sectionId: string): ScenarioContent => mapSection(c, sectionId, (s) => ({ ...s, rows: [...s.rows, newRow()] }));

export const updateRow = (c: ScenarioContent, sectionId: string, rowId: string, patch: Partial<Omit<ScenarioRow, "id">>): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }));

export const removeRow = (c: ScenarioContent, sectionId: string, rowId: string): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.filter((r) => r.id !== rowId) }));

export function moveRow(c: ScenarioContent, sectionId: string, rowId: string, dir: -1 | 1): ScenarioContent {
  const section = c.sections.find((s) => s.id === sectionId);

  const rows = section && move(section.rows, rowId, dir);

  return rows ? mapSection(c, sectionId, (s) => ({ ...s, rows })) : c;
}

function without(row: ScenarioRow, key: "slide" | "battleId"): ScenarioRow {
  const next = { ...row };

  delete next[key];

  return next;
}

export const setRowSlide = (c: ScenarioContent, sectionId: string, rowId: string, slide: ScenarioRowSlide | undefined): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : slide ? { ...r, slide } : without(r, "slide"))) }));

export const setRowBattle = (c: ScenarioContent, sectionId: string, rowId: string, battleId: string | undefined): ScenarioContent =>
  mapSection(c, sectionId, (s) => ({ ...s, rows: s.rows.map((r) => (r.id !== rowId ? r : battleId ? { ...r, battleId } : without(r, "battleId"))) }));
