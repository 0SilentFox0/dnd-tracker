import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const patternGroups = async (filePath: string) => {
  const config = (await new ESLint({ cwd: process.cwd() }).calculateConfigForFile(filePath)) as { rules: Record<string, unknown[]> };

  return ((config.rules["no-restricted-imports"]?.[1] as { patterns?: { group: string[] }[] } | undefined)?.patterns ?? []).flatMap((p) => p.group);
};

describe("rule system isolation", () => {
  it.each(["lib/utils/battle/foo.ts", "components/characters/Foo.tsx", "lib/hooks/characters/useX.ts"])("%s cannot import a system directly", async (file) => {
    expect(await patternGroups(file)).toEqual(expect.arrayContaining(["@/lib/utils/rules/systems/wfrp*", "@/lib/utils/rules/systems/d20*", "@/lib/hooks/systems/wfrp*", "@/components/systems/wfrp*"]));
  });

  it.each(["lib/utils/rules/systems/registry.ts", "components/systems/registry.ts"])("%s may import systems", async (file) => {
    expect(await patternGroups(file)).not.toContain("@/lib/utils/rules/systems/wfrp*");
  });
});
