import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DM_DASHBOARD_SECTIONS, PLAYER_DASHBOARD_SECTIONS } from "@/lib/constants/campaign-dashboard";
import { matchesQuery } from "@/lib/utils/common/text-search";

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

  it("пошук за title і keywords", () => {
    const find = (q: string) => DM_DASHBOARD_SECTIONS.filter((s) => matchesQuery([s.title, ...s.keywords], q)).map((s) => s.key);

    expect(find("моби")).toContain("units");
    expect(find("закл")).toContain("spells");
    expect(find("  СХВАЛ ")).toContain("characters");
  });
});
