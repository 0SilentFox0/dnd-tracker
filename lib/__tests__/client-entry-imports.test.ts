import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^'";]*?\sfrom\s+)?["']([^"']+)["']/g;

function resolveLocal(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;

  if (!base) return null;

  for (const ext of ["", ...EXTENSIONS]) {
    const file = base + ext;

    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }

  return null;
}

const typeOnly = (clause: string | undefined) => {
  const names = clause?.match(/^\s*\{([^}]*)\}\s*from\s+$/)?.[1];

  return !!names && names.split(",").every((n) => !n.trim() || n.trim().startsWith("type "));
};

// статичні імпорти потрапляють в entry-чанк; `import()` / next/dynamic — в окремий
function staticGraph(entries: string[]) {
  const files = new Set<string>();

  const packages = new Map<string, string>();

  const queue = entries.map((e) => path.join(ROOT, e));

  while (queue.length) {
    const file = queue.shift() as string;

    if (files.has(file)) continue;

    files.add(file);

    for (const [, isType, clause, spec] of fs.readFileSync(file, "utf8").matchAll(IMPORT_RE)) {
      if (isType || typeOnly(clause)) continue;

      const local = resolveLocal(file, spec);

      if (local) queue.push(local);
      else if (!spec.startsWith(".") && !spec.startsWith("@/")) packages.set(spec, path.relative(ROOT, file));
    }
  }

  return { files: new Set([...files].map((f) => path.relative(ROOT, f))), packages };
}

const importers = (graph: ReturnType<typeof staticGraph>, pkg: string) =>
  [...graph.packages].filter(([spec]) => spec === pkg || spec.startsWith(`${pkg}/`)).map(([, by]) => by);

describe("entry-чанки гравця", () => {
  const battle = staticGraph(["app/campaigns/[id]/battles/[battleId]/BattlePageClient.tsx"]);

  const profile = staticGraph(["components/character-profile/index.ts", "components/hud/page/index.ts", "components/common/states/index.ts"]);

  it("обхід бачить граф і zod", () => {
    expect(battle.files).toContain("components/battle/scene/ParticipantList.tsx");
    expect(profile.files).toContain("components/character-profile/CharacterProfile.tsx");
    expect(importers(staticGraph(["lib/utils/abilities/read.ts"]), "zod").length).toBeGreaterThan(0);
  });

  it("бій не тягне zod", () => {
    expect(importers(battle, "zod")).toEqual([]);
  });

  it("профіль не тягне zod", () => {
    expect(importers(profile, "zod")).toEqual([]);
  });
});
