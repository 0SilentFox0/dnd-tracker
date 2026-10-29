import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { COMPENDIUM_ERROR_KEYS, COMPENDIUM_KINDS, COMPENDIUM_REF_KINDS } from "@/lib/constants/compendium-import";

const INPUT_ONLY = ["spellSchool", "mergeParent"];

describe("compendium label keys", () => {
  expectLabelKeys("compendium", "inputKinds", [...COMPENDIUM_KINDS, ...INPUT_ONLY]);
  expectLabelKeys("compendium", "categories", COMPENDIUM_KINDS);
  expectLabelKeys("compendium", "targetKinds", [...Object.values(COMPENDIUM_REF_KINDS), "scenarioPages"]);
  expectLabelKeys("compendium", "editions", ["classic", "one", "unknown"]);
  expectLabelKeys("compendium", "statuses", ["create", "update", "unchanged"]);
  expectLabelKeys("compendium", "coverage", ["native", "manual", "partial"]);
  expectLabelKeys("compendium", "errors", [...Object.values(COMPENDIUM_ERROR_KEYS).map((key) => key.replace("errors.", "")), "unknownCode", "httpError", "readFailed", "previewFailed", "confirmFailed", "reportUnavailable", "reportLoadFailed", "optionsLoadFailed"]);
});
