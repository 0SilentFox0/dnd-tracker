import { describe, expect, it } from "vitest";

import { describeLog } from "@/components/character-profile/stash/describe-log";
import { makeT } from "@/lib/i18n/test/mock-t";

const t = makeT("inventory");

const e = (kind: string, delta: Record<string, unknown>, note: string | null = null) => ({ id: "1", kind, delta, note, createdAt: "2026-10-22T10:00:00Z", actor: { id: "u", displayName: "Зехір" } }) as never;

describe("describeLog", () => {
  it("money with a note", () =>
    expect(describeLog(e("money_spend", { gp: -50, sp: 0, cp: 0 }, "найм човна"), t)).toBe(
      'inventory.log.withNote {"text":"inventory.log.money {\\"coins\\":\\"−50 inventory.coins.gp\\"}","note":"найм човна"}',
    ));
  it("DM money set", () => expect(describeLog(e("money_set", { gp: 1 }), t)).toBe('inventory.log.moneySet {"coins":"+1 inventory.coins.gp"}'));
  it("item use", () => expect(describeLog(e("item_use", { item: "Зілля", qty: -1 }), t)).toBe('inventory.log.item.item_use {"name":"Зілля"}'));
  it("artifact", () => expect(describeLog(e("artifact_stash", { artifactId: "a", artifactName: "Меч" }), t)).toBe('inventory.log.artifact.artifact_stash {"name":"Меч"}'));
  it("DM unequip", () => expect(describeLog(e("artifact_unequip", { artifactId: "a", artifactName: "Меч" }), t)).toBe('inventory.log.artifact.artifact_unequip {"name":"Меч"}'));
  it("missing artifact name falls back to a key", () => expect(describeLog(e("artifact_grant", {}), t)).toBe('inventory.log.artifact.artifact_grant {"name":"inventory.log.artifactFallback"}'));
});
