import { describe, expect, it } from "vitest";

import { describeLog } from "@/components/character-profile/stash/describe-log";

const e = (kind: string, delta: Record<string, unknown>, note: string | null = null) => ({ id: "1", kind, delta, note, createdAt: "2026-10-22T10:00:00Z", actor: { id: "u", displayName: "Зехір" } }) as never;

describe("describeLog", () => {
  it("money", () => expect(describeLog(e("money_spend", { gp: -50, sp: 0, cp: 0 }, "найм човна"))).toBe("−50 зм — найм човна"));
  it("item use", () => expect(describeLog(e("item_use", { item: "Зілля", qty: -1 }))).toBe("використано: Зілля"));
  it("artifact", () => expect(describeLog(e("artifact_stash", { artifactId: "a", artifactName: "Меч" }))).toBe("знято в підсумок: Меч"));
  it("DM unequip", () => expect(describeLog(e("artifact_unequip", { artifactId: "a", artifactName: "Меч" }))).toBe("знято в підсумок (DM): Меч"));
});
