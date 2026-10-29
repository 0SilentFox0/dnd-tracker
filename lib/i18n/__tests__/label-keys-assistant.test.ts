import { describe, expect, it } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { HANDOFF_INPUTS } from "@/lib/server/assistant/actions/handoff-navigation";
import { CONTENT_OPERATIONS } from "@/lib/server/content/operations";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

describe("assistant label registries have translations", () => {
  expectLabelKeys("assistant", "operations", Object.keys(CONTENT_OPERATIONS));
  expectLabelKeys("assistant", "contentKinds", Object.keys(CONTENT_RESOURCES));
  expectLabelKeys("assistant", "handoffs", [...Object.keys(HANDOFF_INPUTS), "campaignExport", "contentMedia"]);
  expectLabelKeys("assistant", "results", ["campaign", "characters", "character", "scenario", "show", "newPage", "rules"]);
  expectLabelKeys("assistant", "media", ["icon", "trackFile"]);
  expectLabelKeys("assistant", "blocks", ["callout", "readAloud", "say", "table", "token", "mention", "secret"]);
  expectLabelKeys("assistant", "scenarioOps", ["sectionMissing", "rowMissing", "lossyRow", "removal"]);
  expectLabelKeys("assistant", "summary", ["campaign", "characters", "scenario", "show", "deleteAllPlayers", "cleared", "content"]);
  expectLabelKeys("assistant", "warnings", ["campaignDelete", "characterManual", "serverRoll", "contentCascades", "sourceApply", "importPartial", "manualSetup", "importPartialDone"]);
  expectLabelKeys("assistant", "effects", ["sourceMarks", "skillTreeReplace"]);
  expectLabelKeys("assistant", "defaults", ["copyOf", "skillCopy", "firstChapter", "firstSection"]);
});

describe("model-facing registries carry no Cyrillic", () => {
  it("content operations and resources are English", () => {
    const texts = [...Object.values(CONTENT_OPERATIONS).flatMap((o) => [o.summary, o.description ?? "", o.tag]), ...Object.values(CONTENT_RESOURCES).flatMap((r) => [r.label, r.description])];

    for (const text of texts) expect(text, text).not.toMatch(/\p{Script=Cyrillic}/u);
  });
});
