import { describe, expect, it } from "vitest";

import { docText, isDocEmpty, stripSecrets } from "@/lib/utils/scenario/doc";
import type { RichDoc } from "@/types/scenario";

const secret = [{ type: "secret" as const }];

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Відкрите " }, { type: "text", text: "приховане", marks: secret }] },
    { type: "paragraph", content: [{ type: "text", text: "увесь секрет", marks: secret }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біара" }, marks: secret }, { type: "token", attrs: { color: "green" }, marks: secret }] },
    { type: "table", content: [{ type: "tableRow", content: [
      { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "1.0" }] }] },
      { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "таємна клітинка", marks: secret }] }] },
    ] }] },
    { type: "callout", attrs: { kind: "event", tag: "Тавро" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Пече" }] }] },
  ],
};

describe("stripSecrets", () => {
  it("прибирає секретний текст, атоми й клітинки; порожні блоки зникають", () => {
    const text = docText(stripSecrets(doc));

    expect(text).toContain("Відкрите");
    expect(text).not.toContain("приховане");
    expect(text).not.toContain("увесь секрет");
    expect(text).not.toContain("Біара");
    expect(text).not.toContain("таємна клітинка");
    expect(text).toContain("1.0");
    expect(text).toContain("Тавро");
    expect(stripSecrets(doc).content).toHaveLength(3);
  });

  it("не мутує вхід", () => {
    const before = JSON.stringify(doc);

    stripSecrets(doc);
    expect(JSON.stringify(doc)).toBe(before);
  });
});

describe("docText / isDocEmpty", () => {
  it("лейбл згадки входить у текст, жетон — ні", () => {
    expect(docText({ type: "doc", content: [{ type: "paragraph", content: [{ type: "mention", attrs: { label: "Годрик" } }] }] })).toBe("Годрик");
  });

  it("порожній документ і документ з порожнім абзацом — порожні; з жетоном — ні", () => {
    expect(isDocEmpty({ type: "doc", content: [] })).toBe(true);
    expect(isDocEmpty({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isDocEmpty({ type: "doc", content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "red" } }] }] })).toBe(false);
  });
});
