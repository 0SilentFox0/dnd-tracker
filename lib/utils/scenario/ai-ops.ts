import { type BlockKind, describeLost, lostBlocks } from "./block-inventory";
import { EMPTY_DOC } from "./doc";
import { canonicalJson, isLosslessDoc, markdownToDoc } from "./markdown";
import { newId } from "./structure";

import type { Translator } from "@/lib/i18n/translator";
import type { ScenarioAiOp, ScenarioAiOpInput } from "@/types/ai";
import type { TextParams } from "@/types/choices";
import type { ScenarioContent, ScenarioRow, ScenarioSection } from "@/types/scenario";

type Resolved = { ok: true; ops: ScenarioAiOp[] } | { ok: false; error: { message: string; params?: TextParams } };

const fail = (message: string, params: Record<string, string>): Resolved => ({ ok: false, error: { message: `assistant.scenarioOps.${message}`, params } });

const md = (text: string | undefined) => (text === undefined ? EMPTY_DOC : markdownToDoc(text));

const findSection = (c: ScenarioContent, id: string) => c.sections.find((s) => s.id === id);

export function resolveAiOps(content: ScenarioContent, inputs: ScenarioAiOpInput[], t: Translator): Resolved {
  const ops: ScenarioAiOp[] = [];

  for (const input of inputs) {
    if (input.op === "addSection") {
      if (input.afterSectionId && !findSection(content, input.afterSectionId)) return fail("sectionMissing", { id: input.afterSectionId });

      const section: ScenarioSection = { id: newId(), title: input.title, played: false, rows: input.rows.map((r) => ({ id: newId(), story: md(r.story), notes: md(r.notes) })) };

      ops.push({ op: "addSection", afterSectionId: input.afterSectionId ?? null, section });
      continue;
    }

    if (input.op === "createAcquaintance") {
      ops.push({ op: "createAcquaintance", ref: input.ref, name: input.name, description: input.description ?? "" });
      continue;
    }

    if (input.op === "linkMentions") return fail("notImplemented", { op: input.op });

    const section = findSection(content, input.sectionId);

    if (!section) return fail("sectionMissing", { id: input.sectionId });

    if (input.op === "renameSection") {
      ops.push({ op: "renameSection", sectionId: section.id, title: input.title, before: { title: section.title } });
      continue;
    }

    if (input.op === "insertRow") {
      if (input.afterRowId && !section.rows.some((r) => r.id === input.afterRowId)) return fail("rowMissing", { id: input.afterRowId, section: section.title });

      const row: ScenarioRow = { id: newId(), story: md(input.story), notes: md(input.notes) };

      ops.push({ op: "insertRow", sectionId: section.id, afterRowId: input.afterRowId ?? null, row });
      continue;
    }

    const row = section.rows.find((r) => r.id === input.rowId);

    if (!row) return fail("rowMissing", { id: input.rowId, section: section.title });

    const touched = [input.story !== undefined && row.story, input.notes !== undefined && row.notes].filter((d) => d !== false);

    if (touched.some((d) => !isLosslessDoc(d))) return fail("lossyRow", { id: row.id });

    if (!input.allowRemoval) {
      const lost = { story: input.story !== undefined ? lostBlocks(row.story, md(input.story)) : {}, notes: input.notes !== undefined ? lostBlocks(row.notes, md(input.notes)) : {} };

      const parts = (["story", "notes"] as const).filter((f) => Object.keys(lost[f]).length > 0).map((f) => describeLost(lost[f], (kind: BlockKind, count: number) => t(`blocks.${kind}`, { count })));

      if (parts.length > 0) return fail("removal", { id: row.id, lost: parts.join("; ") });
    }

    ops.push({
      op: "replaceRow",
      sectionId: section.id,
      rowId: row.id,
      ...(input.story !== undefined && { story: md(input.story) }),
      ...(input.notes !== undefined && { notes: md(input.notes) }),
      before: { story: row.story, notes: row.notes },
    });
  }

  return { ok: true, ops };
}

const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

const insertAfter = <T extends { id: string }>(list: T[], afterId: string | null, item: T): T[] | null => {
  if (afterId === null) return [item, ...list];

  const at = list.findIndex((x) => x.id === afterId);

  return at < 0 ? null : [...list.slice(0, at + 1), item, ...list.slice(at + 1)];
};

function applyOne(c: ScenarioContent, op: ScenarioAiOp): ScenarioContent | null {
  if (op.op === "addSection") {
    const sections = insertAfter(c.sections, op.afterSectionId, op.section);

    return sections && { ...c, sections };
  }

  if (op.op === "createAcquaintance") return c;

  const section = findSection(c, op.sectionId);

  if (!section) return null;

  const withSection = (next: ScenarioSection) => ({ ...c, sections: c.sections.map((s) => (s.id === section.id ? next : s)) });

  if (op.op === "renameSection") return section.title === op.before.title ? withSection({ ...section, title: op.title }) : null;

  if (op.op === "insertRow") {
    const rows = insertAfter(section.rows, op.afterRowId, op.row);

    return rows && withSection({ ...section, rows });
  }

  const row = section.rows.find((r) => r.id === op.rowId);

  if (!row || !same(row.story, op.before.story) || !same(row.notes, op.before.notes)) return null;

  const next = { ...row, ...(op.story && { story: op.story }), ...(op.notes && { notes: op.notes }) };

  return withSection({ ...section, rows: section.rows.map((r) => (r.id === row.id ? next : r)) });
}

export function applyAiOps(content: ScenarioContent, ops: ScenarioAiOp[]): { ok: true; content: ScenarioContent } | { ok: false } {
  let c = content;

  for (const op of ops) {
    const next = applyOne(c, op);

    if (!next) return { ok: false };

    c = next;
  }

  return { ok: true, content: c };
}
