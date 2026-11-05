import { describe, expect, it } from "vitest";

import { WFRP_CONDITION_KEYS } from "@/lib/utils/rules/systems/wfrp/conditions/catalog";
import enMagic from "@/messages/en/wfrpMagic.json";
import ukMagic from "@/messages/uk/wfrpMagic.json";

describe("wfrpMagic editor condition labels", () => {
  it.each([["uk", ukMagic], ["en", enMagic]])("%s covers every wfrp condition", (_l, catalog) => {
    const labels = catalog.ui.editor.condition as Record<string, string>;

    for (const key of WFRP_CONDITION_KEYS) expect(labels[key]).toBeTruthy();
  });
});
