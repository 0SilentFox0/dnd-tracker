// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { fakeScene } from "./fake-scene";

import { useAbilityPicker } from "@/lib/hooks/battle/useAbilityPicker";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";

afterEach(cleanup);

const strike = resolved({ trigger: { event: "bonusAction" }, effects: [{ kind: "dealDamage", target: "eventTarget", amount: { formula: "3" }, damageType: "fire" }] });

const heal = resolved({ trigger: { event: "bonusAction" }, effects: [{ kind: "heal", target: "eventTarget", amount: { formula: "3" } }] });

const candidatesFor = (ability: typeof strike) => {
  const { wrapper, gob } = fakeScene();

  const { result } = renderHook(() => useAbilityPicker(gob, "bonusAction", { onOpenChange: () => undefined, onDone: () => undefined }), { wrapper });

  act(() => result.current.pick(ability));

  return result.current.aiming.candidates.map((p) => p.basicInfo.id);
};

it("a DM monster in a normal battle targets heroes with harmful abilities and monsters with helpful ones", () => {
  expect(candidatesFor(strike)).toEqual(["me", "ally"]);
  expect(candidatesFor(heal)).toEqual(["gob"]);
});
