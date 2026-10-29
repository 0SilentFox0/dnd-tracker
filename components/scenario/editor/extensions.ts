import { type Extensions, Mark, mergeAttributes, Node } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";

import { mentionSuggestion } from "./mention-suggestion";

import type { MentionOption } from "@/types/scenario";

const Secret = Mark.create({
  name: "secret",
  parseHTML: () => [{ tag: "span.secret" }],
  renderHTML: ({ HTMLAttributes }) => ["span", mergeAttributes(HTMLAttributes, { class: "secret" }), 0],
});

const ReadAloud = Node.create({
  name: "readAloud",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML: () => [{ tag: "div.read" }],
  renderHTML: () => ["div", { class: "read" }, 0],
});

const Say = Node.create({
  name: "say",
  group: "block",
  content: "inline*",
  parseHTML: () => [{ tag: "p.say" }],
  renderHTML: () => ["p", { class: "say" }, 0],
});

const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "(paragraph|bulletList|orderedList|readAloud|say|table)+",
  defining: true,
  addAttributes: () => ({ kind: { default: "event" }, tag: { default: "" } }),
  parseHTML: () => [{ tag: "div.mark" }],
  renderHTML: ({ node }) => ["div", { class: `mark ${node.attrs.kind}` }, ["span", { class: "tag", contenteditable: "false" }, node.attrs.tag || " "], ["div", 0]],
});

const Token = Node.create({
  name: "token",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ color: { default: "green" } }),
  parseHTML: () => [{ tag: "span.g", getAttrs: () => ({ color: "green" }) }, { tag: "span.r", getAttrs: () => ({ color: "red" }) }],
  renderHTML: ({ node }) => ["span", { class: node.attrs.color === "red" ? "r" : "g" }],
});

const ScenarioImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({
    mediaId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-media-id") },
    src: { default: null, parseHTML: (el: HTMLElement) => el.querySelector("img")?.getAttribute("src") ?? null },
    alt: { default: null, parseHTML: (el: HTMLElement) => el.querySelector("img")?.getAttribute("alt") || null },
    caption: { default: null, parseHTML: (el: HTMLElement) => el.querySelector("figcaption")?.textContent || null },
  }),
  parseHTML: () => [{ tag: "figure[data-media-id]" }],
  renderHTML: ({ node }) => [
    "figure",
    { "data-media-id": node.attrs.mediaId, contenteditable: "false" },
    node.attrs.src ? ["img", { src: node.attrs.src, alt: node.attrs.alt ?? "" }] : ["span", { class: "sb-empty" }, node.attrs.alt || node.attrs.mediaId],
    ...(node.attrs.caption ? [["figcaption", node.attrs.caption]] : []),
  ],
});

const ScenarioMention = Mention.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-mention-type"),
        renderHTML: (attrs: { type?: string | null }) => (attrs.type ? { "data-mention-type": attrs.type } : {}),
      },
    };
  },
});

export function buildExtensions(searchMentions: (q: string) => Promise<MentionOption[]>): Extensions {
  return [
    StarterKit.configure({ heading: { levels: [3] }, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, underline: false, link: false }),
    TableKit.configure({ table: { resizable: false } }),
    Secret,
    ReadAloud,
    Say,
    Callout,
    Token,
    ScenarioImage,
    ScenarioMention.configure({ HTMLAttributes: { class: "mention" }, suggestion: mentionSuggestion(searchMentions) }),
  ];
}
