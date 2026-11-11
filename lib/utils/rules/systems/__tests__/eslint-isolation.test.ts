import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

import { readImportsExempt, SYSTEM_ROOTS } from "@/scripts/shared/system-ratchet";

type RuleEntry = [string, { paths?: ({ name: string } | string)[]; patterns?: { group: string[] }[] }?];

const configOf = async (filePath: string) => (await new ESLint({ cwd: process.cwd() }).calculateConfigForFile(filePath)) as { rules: Record<string, RuleEntry | undefined> };

const restricted = async (filePath: string) => {
  const config = await configOf(filePath);

  const opts = config.rules["no-restricted-imports"]?.[1];

  return {
    groups: (opts?.patterns ?? []).flatMap((p) => p.group),
    names: (opts?.paths ?? []).map((p) => (typeof p === "string" ? p : p.name)),
    zone: (config.rules["systems/zone"]?.[1]?.patterns ?? []).flatMap((p) => p.group),
  };
};

const D20 = "@/lib/utils/rules/systems/d20*";

const ZONE = "@/systems/*";

describe("system import zones", () => {
  it.each(["lib/utils/battle/foo.ts", "components/characters/Foo.tsx", "lib/hooks/characters/useX.ts", "app/api/campaigns/foo/route.ts"])("%s may reach systems only through the roots and not reach d20", async (file) => {
    const r = await restricted(file);

    expect(r.zone).toContain(ZONE);
    expect(r.groups).toContain(D20);
  });

  it.each(["types/foo.ts", "scripts/foo.ts"])("%s may reach systems only through the roots", async (file) => expect((await restricted(file)).zone).toContain(ZONE));

  it("keeps the layer rules next to the zone", async () => {
    expect((await restricted("lib/utils/battle/foo.ts")).names).toContain("@/lib/db");
    expect((await restricted("lib/utils/battle/foo.ts")).groups).toContain("@/app");
    expect((await restricted("components/characters/Foo.tsx")).groups).toContain("@/lib/api");
    expect((await restricted("lib/utils/battle/modes/maze/foo.ts")).zone).toContain(ZONE);
  });

  it.each([...SYSTEM_ROOTS, ...readImportsExempt().map((e) => e.file)])("%s is outside the zone and keeps its layer rules", async (file) => {
    const r = await restricted(file);

    expect(r.zone).toEqual([]);
    expect(r.groups.length).toBeGreaterThan(0);
  });

  it("does not cover tests, system code or the template system scripts", async () => {
    for (const file of ["lib/utils/battle/__tests__/foo.test.ts", "systems/wfrp/rules/x.ts", "scripts/templates/systems/wfrp/x.ts", "scripts/templates/systems/homm/x.ts"]) expect((await restricted(file)).zone).toEqual([]);
  });

  it("applies layer rules inside a system", async () => {
    const rules = await restricted("systems/wfrp/rules/x.ts");

    expect(rules.names).toContain("@/lib/db");
    expect(rules.groups).toEqual(expect.arrayContaining(["@/app", "@/scripts", "@/lib/server", D20]));

    const ui = await restricted("systems/wfrp/ui/x.tsx");

    expect(ui.groups).toEqual(expect.arrayContaining(["@/lib/api", "@/systems/*/api", "@/app", D20]));

    for (const file of ["systems/wfrp/hooks/x.ts", "systems/wfrp/api/x.ts", "systems/wfrp/server/x.ts"]) expect((await restricted(file)).groups).toEqual(expect.arrayContaining(["@/app", "@/scripts", D20]));
  });
});
