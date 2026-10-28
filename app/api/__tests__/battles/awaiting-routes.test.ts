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

describe("allowWhileAwaitingDm", () => {
  it("лише рішення щодо резерву, адмінка та morale-check працюють під час очікування ДМ", async () => {
    const definitions = await Promise.all(routes(ROOT).map(async file => {
      const operation = /operation: "([^"]+)"/.exec(readFileSync(file, "utf8"))?.[1];

      if (!operation) return null;

      const definition = await getBattleOperation(operation, { id: "campaign", battleId: "battle", participantId: "participant" });

      return definition.allowWhileAwaitingDm ? relative(ROOT, join(file, "..")) : null;
    }));

    const allowed = definitions.filter((name): name is string => name !== null).sort();

    expect(allowed).toEqual(["add-participant", "complete", "morale-check", "participants/[participantId]", "refresh-sources", "reset", "reveal-participant", "rollback"]);
  });
});
