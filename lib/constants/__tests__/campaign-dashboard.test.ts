import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { dashboardHiddenKeys, DM_DASHBOARD_SECTIONS, PLAYER_DASHBOARD_SECTIONS } from "@/lib/constants/campaign-dashboard";
import { matchesQuery } from "@/lib/utils/common/text-search";
import uk from "@/messages/uk/dashboard.json";

const ALL = [...DM_DASHBOARD_SECTIONS, ...PLAYER_DASHBOARD_SECTIONS];

describe("dashboard sections", () => {
  it.each(ALL.map((s) => [s.key, s.href("x")]))("%s: %s веде на існуючу сторінку", (_key, href) => {
    const rel = href.replace(/^\/campaigns\/x/, "");

    const file = path.join(process.cwd(), "app/campaigns/[id]", rel, "page.tsx");

    expect(fs.existsSync(file)).toBe(true);
  });

  it("key унікальні в межах списку", () => {
    [DM_DASHBOARD_SECTIONS, PLAYER_DASHBOARD_SECTIONS].forEach((list) => {
      expect(new Set(list.map((s) => s.key)).size).toBe(list.length);
    });
  });

  it("кожна плитка має title, subtitle і keywords у uk", () => {
    for (const s of ALL) expect(uk.sections[s.key as keyof typeof uk.sections], s.key).toMatchObject({ title: expect.any(String), subtitle: expect.any(String), keywords: expect.any(String) });
  });

  it("пошук за title і keywords", () => {
    const fields = (key: string) => {
      const sec = uk.sections[key as keyof typeof uk.sections];

      return [sec.title, ...sec.keywords.split(",").map((k) => k.trim())];
    };

    const find = (q: string) => DM_DASHBOARD_SECTIONS.filter((s) => matchesQuery(fields(s.key), q)).map((s) => s.key);

    expect(find("моби")).toContain("units");
    expect(find("закл")).toContain("spells");
    expect(find("  СХВАЛ ")).toContain("characters");
    expect(find("довідка")).toContain("info");
  });
});

describe("dashboardHiddenKeys", () => {
  it("never hides the acquaintances tile from the DM, even while the toggle is off", () => {
    expect(dashboardHiddenKeys({ isDM: true, hasWorld: false, acquaintancesEnabled: false })).not.toContain("acquaintances");
  });

  it("hides the acquaintances tile from players until the toggle is on, and the map until they have one", () => {
    expect(dashboardHiddenKeys({ isDM: false, hasWorld: false, acquaintancesEnabled: false })).toEqual(["player-world", "acquaintances"]);
    expect(dashboardHiddenKeys({ isDM: false, hasWorld: true, acquaintancesEnabled: true })).toEqual([]);
  });
});
