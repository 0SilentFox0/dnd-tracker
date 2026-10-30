import { describe, expect, it } from "vitest";

import { buildSummaryInput, filterSummaryEntities } from "../input";

import type { RichDoc, RichNode, ScenarioContent } from "@/types/scenario";

const t = (text: string, secret = false): RichNode => ({ type: "text", text, ...(secret && { marks: [{ type: "secret" }] }) });

const chip = (id: string, label: string): RichNode => ({ type: "mention", attrs: { type: "unit", id, label } });

const doc = (...inline: RichNode[]): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: inline }] });

const empty = (): RichDoc => ({ type: "doc", content: [{ type: "paragraph" }] });

const section = (id: string, title: string, story: RichDoc, notes: RichDoc = empty(), played = false) => ({
  id,
  title,
  played,
  rows: [{ id: `${id}-r`, story, notes }],
});

const content = (...sections: ReturnType<typeof section>[]) => ({ legend: [], sections }) as unknown as ScenarioContent;

const page = (c: ScenarioContent) => ({ title: "Cave", kind: "scene", arc: "Arc 1", content: c });

describe("buildSummaryInput", () => {
  it("wraps secrets and states that they are hidden", () => {
    const { prompt } = buildSummaryInput(page(content(section("s1", "Entrance", doc(t("open "), t("trap", true))))), 5000);

    expect(prompt).toContain("||trap||");
    expect(prompt).toContain("hidden from players");
    expect(prompt).toContain("## Entrance");
  });

  it("renders chips and lists each entity once in allowed entities", () => {
    const c = content(section("s1", "A", doc(chip("u1", "Ogre"), t(" and "), chip("u1", "Ogre"))));

    const { prompt, allowedKeys } = buildSummaryInput(page(c), 5000);

    expect(prompt).toContain("[@Ogre](unit:u1)");
    expect(prompt.match(/unit:u1 — Ogre/g)).toHaveLength(1);
    expect([...allowedKeys]).toEqual(["unit:u1"]);
  });

  it("flags an empty page", () => {
    expect(buildSummaryInput(page(content(section("s1", "A", empty()))), 5000).empty).toBe(true);
    expect(buildSummaryInput(page(content(section("s1", "A", doc(t("x"))))), 5000).empty).toBe(false);
  });

  it("marks played sections and DM notes", () => {
    const { prompt } = buildSummaryInput(page(content(section("s1", "A", doc(t("story")), doc(t("note")), true))), 5000);

    expect(prompt).toContain("## A (played)");
    expect(prompt).toContain("DM notes:\nnote");
  });

  it("truncates to the budget and drops entities of dropped sections", () => {
    const c = content(section("s1", "One", doc(t("a".repeat(400)), chip("u1", "Ogre"))), section("s2", "Two", doc(t("b"), chip("u2", "Imp"))));

    const { prompt, truncated, allowedKeys } = buildSummaryInput(page(c), 200);

    expect(truncated).toBe(true);
    expect(prompt).toContain("[truncated]");
    expect(prompt.length).toBeLessThanOrEqual(200);
    expect(allowedKeys.has("unit:u2")).toBe(false);
    expect(prompt).not.toContain("## Two");
  });
});

describe("filterSummaryEntities", () => {
  it("drops unknown keys and duplicates keeping order", () => {
    const s = { overview: "o", events: [], secrets: [], digest: "d", entities: ["unit:b", "unit:x", "unit:a", "unit:b"] };

    expect(filterSummaryEntities(s, new Set(["unit:a", "unit:b"])).entities).toEqual(["unit:b", "unit:a"]);
  });
});
