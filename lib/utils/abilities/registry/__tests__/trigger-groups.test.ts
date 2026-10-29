import { describe, expect, it } from "vitest";

import { TRIGGER_GROUPS, TRIGGER_REGISTRY } from "../triggers";

import abilityRegistryEn from "@/messages/en/abilityRegistry.json";
import abilityRegistryUk from "@/messages/uk/abilityRegistry.json";

type Catalog = { triggers: Record<string, { hint?: string }>; triggerGroups: Record<string, string> };

describe("trigger groups", () => {
  for (const [locale, catalog] of [["uk", abilityRegistryUk], ["en", abilityRegistryEn]] as const) {
    const messages = catalog as unknown as Catalog;

    it(`every event has a known group, hint and group label (${locale})`, () => {
      for (const def of Object.values(TRIGGER_REGISTRY)) {
        expect(TRIGGER_GROUPS, def.event).toContain(def.group);
        expect(messages.triggers[def.event]?.hint, def.event).toBeTruthy();
      }

      for (const group of TRIGGER_GROUPS) expect(messages.triggerGroups[group], group).toBeTruthy();
    });
  }

  it("every group is used", () => {
    const used = new Set(Object.values(TRIGGER_REGISTRY).map((d) => d.group));

    for (const g of TRIGGER_GROUPS.filter((x) => x !== "other")) expect(used.has(g), g).toBe(true);
  });
});
