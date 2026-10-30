import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LIBRARY_SOURCE } from "@/data/library/build";

const ROOTS = ["lib/utils", "lib/constants", "lib/hooks", "components", "app", "lib/server", "lib/cache"];

const ALLOWED_FILES: Record<string, string> = {
  "components/battle/fx/labels.ts": "UI labels of built-in FX archetypes/elements/auras, keyed by FX kind (names coincide with library content)",
  "lib/constants/import-aliases.ts": "CSV import header aliases and example cells (user-facing sample data, not engine rules)",
  "lib/hooks/battle/mock-participants.ts": "dev-only mock participants for the FX/map playground",
};

const ALLOWED: Record<string, string> = {
  "lib/utils/characters/generate/archetype-class.uk.ts: Паладин": "uk class name of the Paladin hero archetype in the generator table",
  "lib/utils/battle/modes/maze/texts.ts: Світло": "maze UI toggle label, not the library name",
  "lib/utils/battle/modes/maze/texts.ts: Темрява": "maze UI toggle label, not the library name",
  "lib/constants/main-skills.ts: Напад": "system label of a built-in main skill",
  "lib/constants/main-skills.ts: Стрільба": "system label of a built-in main skill",
  "lib/constants/main-skills.ts: Захист": "system label of a built-in main skill",
  "lib/constants/main-skills.ts: Лідерство": "system label of a built-in main skill",
  "lib/constants/damage.ts: Блискавка": "label of the built-in damage type",
  "lib/constants/damage.ts: Світло": "label of the built-in damage type",
  "lib/constants/skills.ts: Природа": "label of the built-in skill (ability check)",
  "lib/constants/abilities.ts: Захист": "label of the built-in armorClass stat",
  "lib/hooks/battle/useBattleMapPlayground.ts: Вогняна стіна": "dev-only playground hazard label",
};

// landing: статичний маркетинг; import/fields: приклади значень і назви колонок, не рушій
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);

    if (statSync(p).isDirectory()) return f === "__tests__" || p === "components/landing" || p === "lib/utils/content/import/fields" ? [] : files(p);

    return /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

describe("engine has no content names", () => {
  it("no library race/unit/spell/branch name appears as a string literal", () => {
    const { races, units, spells, branches } = LIBRARY_SOURCE;

    const names = [...races, ...units, ...spells, ...branches].map((x) => x.name).filter((n) => n.length >= 4);

    const offenders: string[] = [];

    for (const file of ROOTS.flatMap(files)) {
      if (file in ALLOWED_FILES) continue;

      const src = readFileSync(file, "utf8");

      for (const name of names) {
        const hit = src.includes(`"${name}"`) || src.includes(`'${name}'`) || src.includes(`\`${name}\``);

        if (hit && !(`${file}: ${name}` in ALLOWED)) offenders.push(`${file}: ${name}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
