import { describe, expect, it, vi } from "vitest";

import { issue, translateCompendiumReport } from "../types";

const getTranslator = async (locale: "en" | "uk", ns: "compendiumReport") => (await vi.importActual<typeof import("@/lib/i18n/translator")>("@/lib/i18n/translator")).getTranslator(locale, ns);

const report = (issues: ReturnType<typeof issue>[]) => ({ rows: [{ issues }], nextActions: issues });

describe("translateCompendiumReport", () => {
  it("builds the message from code and params in the requested locale", async () => {
    const entry = issue("UNRESOLVED_REF", "a", "error", { name: "Fireball", kind: "spell", owner: "Wand" });

    const en = translateCompendiumReport(await getTranslator("en", "compendiumReport"), report([entry]));

    const uk = translateCompendiumReport(await getTranslator("uk", "compendiumReport"), report([entry]));

    expect(en.nextActions[0].action).toContain("“Fireball” (spell)");
    expect(uk.rows[0].issues[0].action).toContain("«Fireball» (заклинання)");
    expect(en.nextActions[0]).not.toHaveProperty("params");
  });

  it("selects the variant and falls back to the default text for unknown codes", async () => {
    const t = await getTranslator("en", "compendiumReport");

    const out = translateCompendiumReport(t, report([issue("MANUAL_MONSTER_ACTION", "a", "warning", { variant: "legendary", name: "Roar" }), issue("NO_SUCH_CODE", "a")]));

    expect(out.nextActions[0].action).toContain("legendary action “Roar”");
    expect(out.nextActions[1].action).toBe("Check the description and configure manually");
  });

  it("keeps legacy rows with a stored message as is", async () => {
    const legacy = { code: "UNRESOLVED_REF", path: "a", severity: "error" as const, action: "Старий текст" };

    const out = translateCompendiumReport(await getTranslator("en", "compendiumReport"), report([legacy]));

    expect(out.nextActions[0].action).toBe("Старий текст");
  });
});
