import { describe, expect, it } from "vitest";

import { critThresholdOf } from "../crit-threshold";

import { MIN_CRIT_ON } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { DEFAULT_RULES } from "@/lib/utils/rules";

describe("critThresholdOf", () => {
  const attacker = createMockParticipant();

  it("без модифікаторів = critOn правил", () => {
    expect(critThresholdOf(DEFAULT_RULES, [attacker], attacker.basicInfo.id)).toBe(20);
    expect(critThresholdOf(undefined, [attacker], attacker.basicInfo.id)).toBe(20);
    expect(critThresholdOf({ criticals: { ...DEFAULT_RULES.criticals, critOn: 19 } }, [attacker], attacker.basicInfo.id)).toBe(19);
  });

  it("великий негативний модифікатор впирається в MIN_CRIT_ON", () => {
    const extra = [{ kind: "modifyStat", stat: "critThreshold", flat: -20 }] as never;

    expect(critThresholdOf(DEFAULT_RULES, [attacker], attacker.basicInfo.id, extra)).toBe(MIN_CRIT_ON);
  });
});
