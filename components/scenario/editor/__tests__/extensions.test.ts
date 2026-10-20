// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { buildExtensions } from "@/components/scenario/editor/extensions";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import type { RichDoc } from "@/types/scenario";

let editor: Editor | null = null;

afterEach(() => editor?.destroy());

const doc: RichDoc = {
  type: "doc",
  content: [
    { type: "readAloud", content: [{ type: "paragraph", content: [{ type: "text", text: "Дзвони" }] }] },
    { type: "say", content: [{ type: "text", text: "«Я повернуся»" }] },
    { type: "callout", attrs: { kind: "choice", tag: "Вибір" }, content: [{ type: "paragraph", content: [{ type: "token", attrs: { color: "red" } }, { type: "text", text: "таємне", marks: [{ type: "secret" }] }] }] },
    { type: "paragraph", content: [{ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } }] },
  ],
};

describe("scenario tiptap extensions", () => {
  it("документ проходить через редактор без втрат і лишається валідним для схеми", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(async () => []), content: doc });

    const json = editor.getJSON() as RichDoc;

    expect(json.content[0].type).toBe("readAloud");
    expect(json.content[1].type).toBe("say");
    expect(json.content[2]).toMatchObject({ type: "callout", attrs: { kind: "choice", tag: "Вибір" } });
    expect(json.content[2].content?.[0].content?.[1].marks).toEqual([{ type: "secret" }]);
    expect(json.content[3].content?.[0]).toMatchObject({ type: "mention", attrs: { type: "unit", id: "u1", label: "Біс" } });

    const parsed = scenarioContentSchema.safeParse({ legend: [], sections: [{ id: "s", title: "s", played: false, rows: [{ id: "r", story: json, notes: { type: "doc", content: [] } }] }] });

    expect(parsed.success).toBe(true);
  });

  it("команди тулбара створюють дозволені вузли", () => {
    editor = new Editor({ element: document.createElement("div"), extensions: buildExtensions(async () => []), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] } });
    editor.chain().selectAll().toggleWrap("callout", { kind: "event", tag: "Подія" }).run();
    editor.chain().focus("end").insertContent({ type: "token", attrs: { color: "green" } }).run();
    editor.chain().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();

    const parsed = scenarioContentSchema.safeParse({ legend: [], sections: [{ id: "s", title: "s", played: false, rows: [{ id: "r", story: editor.getJSON(), notes: { type: "doc", content: [] } }] }] });

    expect(parsed.success).toBe(true);
  });
});
