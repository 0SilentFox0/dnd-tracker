// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const rules = vi.hoisted(() => ({ system: undefined as { key: string; modules?: string[] } | undefined }));

vi.mock("@/lib/hooks/campaigns", () => ({ useCampaignRules: () => ({ data: rules.system && { system: rules.system } }) }));

import { useAbilityComposition } from "@/lib/hooks/abilities/useAbilityComposition";

const pick = (system?: { key: string; modules?: string[] }) => {
  rules.system = system;

  return renderHook(() => useAbilityComposition("c1")).result.current;
};

describe("useAbilityComposition", () => {
  it("bare dnd5e hides morale kinds, flags and variables", () => {
    const c = pick({ key: "dnd5e" });

    expect(c.kinds({ event: "roundStart" })).not.toContain("changeMorale");
    expect(c.flags).not.toContain("moraleChance");
    expect(c.variables).not.toContain("morale");
  });

  it("dnd5e + morale offers them", () => {
    const c = pick({ key: "dnd5e", modules: ["morale"] });

    expect(c.kinds({ event: "roundStart" })).toContain("changeMorale");
    expect(c.flags).toContain("moraleChance");
    expect(c.variables).toContain("morale");
  });

  it("without rules everything is offered", () => {
    expect(pick(undefined).kinds({ event: "roundStart" })).toContain("changeMorale");
  });
});
