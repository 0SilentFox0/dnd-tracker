import { describe, expect, it } from "vitest";

import { DEMO_GM_NOTES, DEMO_SCENE_CONTENT } from "./example-demo-content";

import { CALLOUT_KINDS, MARK_TYPES, NODE_TYPES, SECTION_ICON_KEYS } from "@/lib/constants/scenario";
import { scenarioContentSchema } from "@/lib/schemas/scenario";

function collect(node: { type?: string; attrs?: Record<string, unknown>; marks?: { type: string }[]; content?: typeof node[] }, out: { types: Set<string>; marks: Set<string>; callouts: Set<string> }) {
  if (node.type) out.types.add(node.type);

  node.marks?.forEach((mark) => out.marks.add(mark.type));

  if (node.type === "callout" && typeof node.attrs?.kind === "string") out.callouts.add(node.attrs.kind);

  node.content?.forEach((child) => collect(child, out));
}

describe("Example Demo scenario content", () => {
  it("uses valid full editor content, every rich-text node/mark/callout, and linked music and battles", () => {
    expect(scenarioContentSchema.safeParse(DEMO_SCENE_CONTENT).success).toBe(true);
    expect(scenarioContentSchema.safeParse(DEMO_GM_NOTES).success).toBe(true);

    const found = { types: new Set<string>(), marks: new Set<string>(), callouts: new Set<string>() };

    collect({ type: "doc", content: [...DEMO_SCENE_CONTENT.sections, ...DEMO_GM_NOTES.sections].flatMap((section) => section.rows.flatMap((row) => [row.story, row.notes])) }, found);

    expect([...found.types].sort()).toEqual([...NODE_TYPES].sort());
    expect([...found.marks].sort()).toEqual([...MARK_TYPES].sort());
    expect([...found.callouts].sort()).toEqual([...CALLOUT_KINDS].sort());
    expect([...new Set(DEMO_SCENE_CONTENT.sections.map((section) => section.icon))].sort()).toEqual([...SECTION_ICON_KEYS].sort());
    expect(DEMO_SCENE_CONTENT.sections.flatMap((section) => section.rows).some((row) => row.slide && row.battleId && row.marker)).toBe(true);
  });
});
