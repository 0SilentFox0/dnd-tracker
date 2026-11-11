import { describe, expect, it } from "vitest";

import enMagic from "@/messages/en/wfrpMagic.json";
import ukMagic from "@/messages/uk/wfrpMagic.json";
import { WFRP_CONDITION_KEYS } from "@/systems/wfrp/rules/conditions/catalog";

describe("wfrpMagic editor condition labels", () => {
  it.each([["uk", ukMagic], ["en", enMagic]])("%s covers every wfrp condition", (_l, catalog) => {
    const labels = catalog.ui.editor.condition as Record<string, string>;

    for (const key of WFRP_CONDITION_KEYS) expect(labels[key]).toBeTruthy();
  });
});
