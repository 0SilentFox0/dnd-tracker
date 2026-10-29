import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

const SERVER_ROOT = join(process.cwd(), "lib/server/compendium-import");

const thrownCodes = () => {
  const codes = new Set<string>();

  for (const file of readdirSync(SERVER_ROOT).filter((name) => name.endsWith(".ts"))) {
    for (const match of readFileSync(join(SERVER_ROOT, file), "utf8").matchAll(/(?:CompendiumError|fail)\("([A-Z_]+)"|json\(\{ code: "([A-Z_]+)"/g)) codes.add(match[1] ?? match[2]);
  }

  return codes;
};

describe("compendium error codes", () => {
  it("every code the server throws or returns has a message key", () => {
    const missing = [...thrownCodes()].filter((code) => !COMPENDIUM_ERROR_KEYS[code]);

    expect(missing).toEqual([]);
  });
});
