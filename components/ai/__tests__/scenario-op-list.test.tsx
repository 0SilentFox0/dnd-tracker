// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { ScenarioOpList } from "../ScenarioOpList";

import type { ScenarioAiOp } from "@/types/ai";

afterEach(cleanup);

const doc = (...nodes: unknown[]) => ({ type: "doc", content: [{ type: "paragraph", content: nodes }] });

const text = (t: string) => ({ type: "text", text: t });

const chip = { type: "mention", attrs: { id: "a1", label: "Бі", type: "acquaintance" } };

const chipRow = (rowId: string) => ({ op: "replaceRow", sectionId: "s1", rowId, story: doc(chip), before: { story: doc(text("Бі")), notes: doc() } });

const textRow = (rowId: string, to: string) => ({ op: "replaceRow", sectionId: "s1", rowId, story: doc(text(to)), before: { story: doc(text("старе")), notes: doc() } });

const render_ = (ops: unknown[]) => render(<ScenarioOpList ops={ops as ScenarioAiOp[]} campaignId="c1" />);

it("chip-only rows render compactly with an NPC card", () => {
  render_([{ op: "createAcquaintance", ref: "b", name: "Бі", description: "" }, chipRow("r1"), chipRow("r2"), chipRow("r3")]);
  expect(screen.getByText(/ai\.proposal\.newAcquaintance/)).toBeTruthy();
  expect(screen.getByText(/ai\.proposal\.changedRows/)).toBeTruthy();
  expect(screen.getAllByText(/ai\.proposal\.chipsAdded/)).toHaveLength(3);
  expect(screen.queryByText(/ai\.proposal\.before/)).toBeNull();
});

it("a text change falls back to before/after", () => {
  render_([textRow("r1", "нове")]);
  expect(screen.getByText(/ai\.proposal\.before/)).toBeTruthy();
  expect(screen.getByText(/ai\.proposal\.after/)).toBeTruthy();
  expect(screen.queryByText(/ai\.proposal\.chipsAdded/)).toBeNull();
});

it("paginates long lists", () => {
  render_(Array.from({ length: 25 }, (_, i) => textRow(`r${i}`, `нове${i}`)));
  expect(screen.getAllByText(/ai\.proposal\.before/)).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "ai.intent.nextChanges" }));
  expect(screen.getAllByText(/ai\.proposal\.before/)).toHaveLength(5);
});
