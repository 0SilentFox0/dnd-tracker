import { describe, expect, it } from "vitest";

import { DM_SECTION_LABELS, dmSectionsFor, dmTilesFor } from "@/lib/constants/campaigns";

const paths = (s: { path: string }[]) => s.map((x) => x.path);

describe("dmSectionsFor", () => {
  it("template without classes hides classes, feats, backgrounds and campaign-only sections", () => {
    const p = paths(dmSectionsFor({ isTemplate: true, classesEnabled: false }));

    for (const hidden of ["classes", "feats", "backgrounds", "characters", "battles", "scenario", "show", "assistant"]) expect(p).not.toContain(hidden);

    expect(p).toEqual(expect.arrayContaining(["spells", "units", "rules", "spell-groups", "music"]));
  });

  it("hides skill libraries in class (5e) campaigns only", () => {
    expect(paths(dmSectionsFor({ isTemplate: false, classesEnabled: true }))).not.toContain("skills");
    expect(paths(dmSectionsFor({ isTemplate: false, classesEnabled: true }))).not.toContain("skill-trees");
    expect(paths(dmSectionsFor({ isTemplate: false, classesEnabled: false }))).toEqual(expect.arrayContaining(["skills", "skill-trees"]));
    expect(paths(dmTilesFor({ isTemplate: false, classesEnabled: true }))).not.toContain("skills");
  });

  it("template menu keeps the API tokens entry", () => {
    expect(paths(dmSectionsFor({ isTemplate: true, classesEnabled: false }))).toContain("ai");
  });

  it("template with classes shows the class library", () => {
    expect(paths(dmSectionsFor({ isTemplate: true, classesEnabled: true }))).toEqual(expect.arrayContaining(["classes", "feats", "backgrounds"]));
  });

  it("campaign shows characters, battles and scenario", () => {
    expect(paths(dmSectionsFor({ isTemplate: false, classesEnabled: false }))).toEqual(expect.arrayContaining(["characters", "battles", "scenario", "assistant", "ai"]));
  });

  it("menu and page tiles agree on a template except menu-only entries", () => {
    for (const classesEnabled of [false, true]) {
      const ctx = { isTemplate: true, classesEnabled };

      expect(paths(dmSectionsFor(ctx)).filter((p) => !paths(dmTilesFor(ctx)).includes(p))).toEqual(["ai"]);
    }
  });

  it("campaign tiles are a subset of the menu and skip template-only tiles", () => {
    const ctx = { isTemplate: false, classesEnabled: true };

    const menu = paths(dmSectionsFor(ctx));

    expect(menu).toEqual(expect.arrayContaining(paths(dmTilesFor(ctx))));
    expect(paths(dmTilesFor(ctx))).not.toContain("rules");
  });

  it("exposes breadcrumb labels by path", () => {
    expect(DM_SECTION_LABELS.units).toBe("Юніти");
  });
});
