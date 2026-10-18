import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "app/api/campaigns/[id]/battles/[battleId]");

function routes(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return routes(path);

    return name === "route.ts" ? [path] : [];
  });
}

describe("allowWhileAwaitingDm", () => {
  it("лише рішення щодо резерву, адмінка та morale-check працюють під час очікування ДМ", () => {
    const allowed = routes(ROOT)
      .filter((file) => /allowWhileAwaitingDm:\s*true/.test(readFileSync(file, "utf8")))
      .map((file) => relative(ROOT, join(file, "..")))
      .sort();

    expect(allowed).toEqual(["add-participant", "complete", "morale-check", "participants/[participantId]", "reset", "reveal-participant", "rollback"]);
  });
});
