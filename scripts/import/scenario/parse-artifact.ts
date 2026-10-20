import { type HTMLElement, type Node as HtmlNode, NodeType, parse } from "node-html-parser";

import { CALLOUT_KINDS } from "@/lib/constants/scenario";
import { newId } from "@/lib/utils/scenario/structure";
import type { CalloutKind, LegendEntry, LegendKind, RichDoc, RichMark, RichNode, ScenarioContent, ScenarioPageKind, ScenarioSection } from "@/types/scenario";

const LEGEND_BY_SWATCH: [string, LegendKind][] = [["--blood", "read"], ["--night", "choice"], ["--verdigris", "token"], ["--gold", "artifact"], ["#5b3a78", "shadow"], ["--ink-soft", "check"], ["--margin", "notes"]];

const HERO_BOXES: [string, CalloutKind][] = [["key", "hero"], ["goal", "goal"], ["secretbox", "confide"]];

const clean = (s: string) => s.replace(/\s+/g, " ");

const isEl = (n: HtmlNode): n is HTMLElement => n.nodeType === NodeType.ELEMENT_NODE;

const tagOf = (el: HTMLElement) => el.tagName.toLowerCase();

const has = (el: HTMLElement, cls: string) => el.classList.contains(cls);

const kids = (el: HTMLElement, tag?: string) => el.childNodes.filter(isEl).filter((c) => !tag || tagOf(c) === tag);

function inline(node: HtmlNode, marks: RichMark[]): RichNode[] {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = clean(node.text);

    return text ? [{ type: "text", text, ...(marks.length > 0 && { marks }) }] : [];
  }

  if (!isEl(node)) return [];

  const tag = tagOf(node);

  if (tag === "br") return [{ type: "hardBreak" }];

  if (tag === "span" && (has(node, "g") || has(node, "r"))) return [{ type: "token", attrs: { color: has(node, "g") ? "green" : "red" }, ...(marks.length > 0 && { marks }) }];

  return node.childNodes.flatMap((c) => inline(c, withMarks(node, marks)));
}

function withMarks(el: HTMLElement, marks: RichMark[]): RichMark[] {
  const next = [...marks];

  const add = (type: RichMark["type"]) => {
    if (!next.some((m) => m.type === type)) next.push({ type });
  };

  if (has(el, "secret")) add("secret");

  if (["b", "strong"].includes(tagOf(el))) add("bold");

  if (["i", "em"].includes(tagOf(el))) add("italic");

  return next;
}

function trimInline(nodes: RichNode[]): RichNode[] {
  const out = nodes.map((n) => ({ ...n }));

  const first = out[0];

  const last = out.at(-1);

  if (first?.type === "text") first.text = first.text?.trimStart();

  if (last?.type === "text") last.text = last.text?.trimEnd();

  return out.filter((n) => n.type !== "text" || n.text);
}

const inlineOf = (nodes: HtmlNode[], marks: RichMark[]) => trimInline(nodes.flatMap((c) => inline(c, marks)));

// the element's own class (p.secret) applies to all of its text
function paragraph(el: HTMLElement): RichNode {
  const content = inlineOf(el.childNodes, has(el, "secret") ? [{ type: "secret" }] : []);

  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

const list = (el: HTMLElement): RichNode => ({ type: tagOf(el) === "ol" ? "orderedList" : "bulletList", content: kids(el, "li").map((li) => ({ type: "listItem", content: [paragraph(li)] })) });

const table = (el: HTMLElement): RichNode => ({
  type: "table",
  content: el.querySelectorAll("tr").map((tr) => ({ type: "tableRow", content: kids(tr).filter((c) => ["td", "th"].includes(tagOf(c))).map((td) => ({ type: "tableCell", content: [paragraph(td)] })) })),
});

function calloutBody(el: HTMLElement, skip: HTMLElement | null): RichNode[] {
  const out: RichNode[] = [];

  let loose: HtmlNode[] = [];

  const flushLoose = () => {
    const content = inlineOf(loose, []);

    if (content.length) out.push({ type: "paragraph", content });

    loose = [];
  };

  for (const child of el.childNodes) {
    if (child === skip) continue;

    if (isEl(child) && (["p", "ul", "ol"].includes(tagOf(child)) || has(child, "read") || has(child, "jumps"))) {
      flushLoose();
      out.push(...block(child));
    } else {
      loose.push(child);
    }
  }

  flushLoose();

  return out.length ? out : [{ type: "paragraph" }];
}

const callout = (el: HTMLElement, kind: CalloutKind, title: HTMLElement | null): RichNode => ({ type: "callout", attrs: { kind, tag: clean(title?.text ?? "").trim() }, content: calloutBody(el, title) });

function block(el: HTMLElement): RichNode[] {
  const tag = tagOf(el);

  if (tag === "h3") return [{ type: "heading", attrs: { level: 3 }, content: inlineOf(el.childNodes, []) }];

  if (tag === "p" && (has(el, "say") || has(el, "quote"))) return [{ type: "say", content: paragraph(el).content ?? [] }];

  if (tag === "p") return [paragraph(el)];

  if (tag === "ul" || tag === "ol") return [list(el)];

  if (tag === "table") return [table(el)];

  if (has(el, "read")) {
    const paragraphs = kids(el, "p").map(paragraph);

    return [{ type: "readAloud", content: paragraphs.length ? paragraphs : [paragraph(el)] }];
  }

  if (has(el, "mark")) return [callout(el, CALLOUT_KINDS.find((k) => has(el, k)) ?? "event", kids(el).find((c) => has(c, "tag")) ?? null)];

  const box = HERO_BOXES.find(([cls]) => has(el, cls));

  if (box) return [callout(el, box[1], kids(el, "b")[0] ?? null)];

  if (has(el, "jumps") || has(el, "priv")) return [];

  const text = clean(el.text).trim();

  return text ? [{ type: "paragraph", content: [{ type: "text", text }] }] : [];
}

const docOf = (blocks: HTMLElement[]): RichDoc => ({ type: "doc", content: blocks.flatMap(block) });

function legendOf(root: HTMLElement): LegendEntry[] {
  return root.querySelectorAll(".legend span").flatMap((span) => {
    const style = (span.querySelector("i")?.getAttribute("style") ?? "").toLowerCase();

    const kind = LEGEND_BY_SWATCH.find(([needle]) => style.includes(needle))?.[1];

    return kind ? [{ kind, label: clean(span.text).trim() }] : [];
  });
}

function sectionOf(sec: HTMLElement, kind: ScenarioPageKind, quote: HTMLElement | null): ScenarioSection {
  const title = clean(kids(sec, "h2")[0]?.text ?? "").trim();

  const rows = kids(sec).filter((c) => has(c, "row"));

  if (rows.length) {
    return {
      id: newId(),
      title,
      played: false,
      rows: rows.map((row) => {
        const story = kids(row).find((c) => has(c, "story"));

        const notes = kids(row).find((c) => has(c, "notes"));

        return { id: newId(), story: docOf(story ? kids(story) : []), notes: docOf(notes ? kids(notes) : []) };
      }),
    };
  }

  const story = docOf(kids(sec).filter((c) => tagOf(c) !== "h2"));

  if (quote) story.content.unshift(block(quote)[0]);

  return { id: newId(), title, played: false, ...(kind === "hero" && { reveal: { mode: "manual" as const } }), rows: [{ id: newId(), story, notes: { type: "doc", content: [] } }] };
}

export function parseArtifactHtml(html: string, kind: ScenarioPageKind): { title: string; subtitle: string | null; content: ScenarioContent } {
  const root = parse(html);

  const header = root.querySelector("header.title");

  const headerParagraphs = header ? kids(header, "p") : [];

  const quote = headerParagraphs.find((p) => has(p, "quote")) ?? null;

  const title = clean(header?.querySelector("h1")?.text ?? root.querySelector("title")?.text ?? "Без назви").trim();

  const subtitle = clean(headerParagraphs.find((p) => !has(p, "quote"))?.text ?? "").trim() || null;

  const main = root.querySelector("main");

  const sections = (main ? kids(main, "section") : []).map((sec, i) => sectionOf(sec, kind, i === 0 ? quote : null));

  return { title, subtitle, content: { legend: legendOf(root), sections } };
}
