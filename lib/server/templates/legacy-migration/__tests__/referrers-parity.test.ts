import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { referrerRows,REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import { hashJson } from "@/lib/utils/battle/store/stable-json";

const models = Prisma.dmmf.datamodel.models;

const modes = (name: string) => REFERRERS.filter((r) => r.model === name).map((r) => r.mode);

describe("referrer registry parity with the schema", () => {
  it("classifies every model", () => {
    const missing = models.filter((m) => modes(m.name).length === 0).map((m) => m.name);

    expect(missing).toEqual([]);
  });

  it("lists only existing columns", () => {
    for (const r of REFERRERS) {
      const fields = new Set(models.find((m) => m.name === r.model)?.fields.map((f) => f.name));

      for (const c of r.columns ?? []) expect(fields.has(c), `${r.model}.${c}`).toBe(true);
    }
  });

  it("marks the 13 content models content and every *Base model global", () => {
    const names = new Set(models.map((m) => m.name));

    const contentModels = models.filter((m) => names.has(`${m.name}Base`)).map((m) => m.name);

    expect(contentModels).toHaveLength(13);

    for (const name of contentModels) expect(modes(name)).toEqual(["content"]);

    for (const name of contentModels.map((n) => `${n}Base`)) expect(modes(name)).toEqual(["global"]);
  });

  it("splits battles and proposals by state", () => {
    expect(modes("BattleScene")).toEqual(["remap", "history"]);
    expect(modes("BattleParticipant")).toEqual(["remap", "history"]);
    expect(modes("AiProposal")).toEqual(["remap", "history"]);
  });

  it("derives the participant snapshotHash and the notification href", () => {
    const participant = REFERRERS.find((r) => r.model === "BattleParticipant" && r.mode === "remap");

    const snapshot = { id: "new", nested: { a: 1 } };

    expect(participant?.derive?.({ snapshot }, "camp")).toEqual({ snapshotHash: hashJson(snapshot) });
    expect(participant?.columnsFor?.({ sourceType: "unit" })).toContain("sourceId");
    expect(participant?.columnsFor?.({ sourceType: "character" })).not.toContain("sourceId");

    const notification = REFERRERS.find((r) => r.model === "PlayerNotification");

    expect(notification?.derive?.({ type: "item", refId: "x" }, "camp")).toEqual({ href: "/campaigns/camp/character?tab=items" });
    expect(notification?.derive?.({ type: "acquaintance", refId: "a b" }, "camp")).toEqual({ href: "/campaigns/camp/acquaintances?focus=a%20b" });
  });

  it("reads rows through the delegate scope and skips global models", async () => {
    const calls: unknown[] = [];

    const db = { character: { findMany: async (args: unknown) => { calls.push(args);

 return [{ id: "1" }]; } } };

    const character = REFERRERS.filter((r) => r.model === "Character")[0];

    const user = REFERRERS.filter((r) => r.model === "User")[0];

    expect(await referrerRows(db, character, "camp")).toEqual([{ id: "1" }]);
    expect(calls).toEqual([{ where: { campaignId: "camp" } }]);
    expect(await referrerRows(db, user, "camp")).toEqual([]);
  });
});
