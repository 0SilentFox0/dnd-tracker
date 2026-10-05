import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const rulesFor = async (filePath: string) => ((await new ESLint({ cwd: process.cwd() }).calculateConfigForFile(filePath)) as { rules: Record<string, unknown[]> }).rules;

const restrictedImports = (rule: unknown[] | undefined) => ((rule?.[1] as { paths?: { name: string }[] } | undefined)?.paths ?? []).map((p) => p.name);

const restrictedGlobals = (rule: unknown[] | undefined) => (rule ?? []).slice(1).map((g) => (typeof g === "string" ? g : (g as { name: string }).name));

describe("ESLint guards", () => {
  it.each(["components/foo/Bar.tsx", "app/campaigns/[id]/page.tsx", "lib/hooks/battle/useX.ts"])("raw dialog, alert-dialog, vaul, confirm, alert forbidden in %s", async (file) => {
    const rules = await rulesFor(file);

    expect(rules["no-restricted-imports"]?.[0]).toBe(2);
    expect(restrictedImports(rules["no-restricted-imports"])).toEqual(expect.arrayContaining(["@/components/ui/dialog", "@/components/ui/alert-dialog", "vaul"]));
    expect(restrictedGlobals(rules["no-restricted-globals"])).toEqual(expect.arrayContaining(["confirm", "alert"]));
  });

  it("allowed inside components/ui", async () => {
    expect(restrictedImports((await rulesFor("components/ui/responsive-dialog.tsx"))["no-restricted-imports"])).not.toContain("vaul");
  });
});
