import { describe, expect, it } from "vitest";

import { mapToTemplate, parseCatalog, TOKEN_SIZE } from "../catalog";

const CSV = [
  "﻿id,record_id,name,record_type,generation_group,generation_race,creature_type,spell_group,raw_path,image_path,metadata_path",
  'a,spell:srd-2024_x,"Foo, the Bar",spell,g,,,sg,raw/a.png,icons/spell/a.png,m',
  "b,unit:srd-2024_u,U,unit,g,,,,raw/u.png,tokens/unit/u.png,m",
  "c,artefact:srd-2024_adamantine-armor-plate,AP,artefact,g,,,,r,icons/artefact/ap.png,m",
  "d,artefact:srd-2024_adamantine-armor-breastplate,AB,artefact,g,,,,r,icons/artefact/ab.png,m",
  "e,artefact:srd-2024_amulet,A,artefact,g,,,,r,icons/artefact/am.png,m",
  "f,other:srd-2024_z,Z,other,g,,,,r,icons/z.png,m",
].join("\n");

describe("parseCatalog", () => {
  it("keeps three kinds, handles BOM and quoted commas", () => {
    const e = parseCatalog(CSV);

    expect(e.map((x) => [x.kind, x.slug])).toEqual([
      ["spells", "srd-2024_x"],
      ["units", "srd-2024_u"],
      ["artifacts", "srd-2024_adamantine-armor-plate"],
      ["artifacts", "srd-2024_adamantine-armor-breastplate"],
      ["artifacts", "srd-2024_amulet"],
    ]);
    expect(e[0].imagePath).toBe("icons/spell/a.png");
  });
});

describe("mapToTemplate", () => {
  const slugs = { spells: ["srd-2024_x", "srd-2024_missing"], units: ["srd-2024_u"], artifacts: ["srd-2024_adamantine-armor", "srd-2024_amulet", "srd-2024_none"] };

  it("direct match wins, variant picks the alphabetically first, reports gaps", () => {
    const r = mapToTemplate(parseCatalog(CSV), slugs);

    expect(r.picked.find((p) => p.slug === "srd-2024_adamantine-armor")).toMatchObject({ via: "srd-2024_adamantine-armor-breastplate", imagePath: "icons/artefact/ab.png" });
    expect(r.picked.find((p) => p.slug === "srd-2024_amulet")?.via).toBeUndefined();
    expect(r.templateOnly).toEqual([{ kind: "spells", slug: "srd-2024_missing" }, { kind: "artifacts", slug: "srd-2024_none" }]);
    expect(r.catalogOnly).toBe(1);
  });
});

it("sizes", () => expect(TOKEN_SIZE).toEqual({ spells: 256, artifacts: 256, units: 384 }));
