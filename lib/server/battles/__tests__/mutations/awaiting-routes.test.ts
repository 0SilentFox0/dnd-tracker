import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { getBattleOperation } from "@/lib/server/battles/operations";

const ROOT = join(process.cwd(), "app/api/campaigns/[id]/battles/[battleId]");

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return routes(path);

    return name === "route.ts" ? [path] : [];
  });
}

async function allowing(flag: "allowWhileAwaitingDm" | "allowWhileCritPending"): Promise<string[]> {
  const found = await Promise.all(routes(ROOT).map(async (file) => {
    const operation = /operation: "([^"]+)"/.exec(readFileSync(file, "utf8"))?.[1];

    if (!operation) return null;

    const definition = await getBattleOperation(operation, { id: "campaign", battleId: "battle", participantId: "participant" });

    return definition[flag] ? relative(ROOT, join(file, "..")) : null;
  }));

  return found.filter((name): name is string => name !== null).sort();
}

describe("allowWhileAwaitingDm", () => {
  it("лише рішення щодо резерву, адмінка та morale-check працюють під час очікування ДМ", async () => {
    expect(await allowing("allowWhileAwaitingDm")).toEqual(["add-participant", "complete", "crit-choice", "morale-check", "participants/[participantId]", "refresh-sources", "reset", "reveal-participant", "rollback"]);
  });

  it("allowWhileCritPending: лише вибір крита, завершення, скидання й відкат", async () => {
    expect(await allowing("allowWhileCritPending")).toEqual(["complete", "crit-choice", "reset", "rollback"]);
  });
});
