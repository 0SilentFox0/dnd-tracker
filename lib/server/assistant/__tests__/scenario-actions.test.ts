import { describe, expect, it } from "vitest";

import { SCENARIO_ACTIONS } from "@/lib/server/assistant/actions/scenario";
import { confirmationFor } from "@/lib/server/assistant/policy";
import { scenarioFingerprint,transformScenarioContent } from "@/lib/server/scenario/action-service";
import type { ScenarioContent } from "@/types/scenario";

const content: ScenarioContent = { legend: [], sections: [{ id: "s", title: "Сцена", played: false, rows: [{ id: "r", story: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Історія", marks: [{ type: "bold" }] }] }] }, notes: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Секрет" }] }] }, battleId: "battle", slide: { deckId: "deck", slideId: "slide" } }] }, { id: "s2", title: "Друга", played: false, rows: [] }] };

describe("scenario actions", () => {
  it("replaceKeepsRichBlocks", () => {
    const result = transformScenarioContent(content, "section.move", { sectionId: "s", direction: 1 });

    expect(result.sections[1]).toEqual(content.sections[0]);
    expect(content.sections[0].id).toBe("s");
  });
  it("metadataChangeMakesPreviewStale", () => {
    expect(scenarioFingerprint({ version: 1, title: "A", content })).not.toBe(scenarioFingerprint({ version: 1, title: "B", content }));
  });
  it("restoreAlwaysHuman", () => {
    expect(SCENARIO_ACTIONS.find(a => a.id === "scenario.restore")).toMatchObject({ confirmation: "always" });
  });
  it("full content replacement cannot erase rows automatically", () => {
    const action = SCENARIO_ACTIONS.find(a => a.id === "scenario.save");

    if (!action) throw new Error("missing action");

    expect(confirmationFor(action, "auto", { summary: "Замінити вміст", targets: [], changes: [], warnings: [], preconditions: {}, effects: [{ kind: "update", targets: [], description: "Замінити сторінку" }] })).toBe("human");
  });
  it("notesSearchAndBindingsPreserved", () => {
    expect(transformScenarioContent(content, "row.move", { sectionId: "s", rowId: "r", direction: 1 })).toEqual(content);
    expect(() => transformScenarioContent(content, "row.delete", { sectionId: "s", rowId: "foreign" })).toThrow();

    const next = transformScenarioContent(content, "section.delete", { sectionId: "s2" });

    expect(next.sections[0].rows[0]).toEqual(content.sections[0].rows[0]);
  });
});

// The shared save path is exercised against the real local transaction in
// scenario-storage.integration.test.ts, including snapshot ordering and CAS.
