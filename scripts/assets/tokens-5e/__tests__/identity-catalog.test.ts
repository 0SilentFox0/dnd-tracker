import { describe, expect, it } from "vitest";

import { readSrdData } from "../../../srd/lib/data-files";
import type { SrdData } from "../../../srd/lib/types";
import { expectedTargets, parseIdentityCsv } from "../identity-catalog";

const ab = (id: string) => ({ id, name: id, trigger: { event: "passive" }, effects: [] });

const fixture = {
  races: [{ slug: "srd-2024_elf" }],
  backgrounds: [{ slug: "srd-2024_sage" }],
  feats: [{ slug: "srd-2024_alert" }],
  classes: [
    {
      slug: "srd-2024_wizard",
      features: [{ level: 18, abilities: [ab("spell-mastery-18"), ab("wizard-subclass-3")] }],
      subclasses: [{ id: "evoker", name: "Evoker", features: [{ level: 3, abilities: [ab("x-3")] }] }],
    },
  ],
} as unknown as SrdData;

describe("expectedTargets", () => {
  it("maps keys and record ids, aliases subclasses, skips placeholders", () => {
    expect(expectedTargets(fixture)).toEqual([
      { kind: "races", key: "srd-2024_elf", recordId: "race:elf" },
      { kind: "classes", key: "srd-2024_wizard", recordId: "class:wizard" },
      { kind: "subclasses", key: "srd-2024_wizard/evoker", recordId: "subclass:wizard-school-of-evocation" },
      { kind: "backgrounds", key: "srd-2024_sage", recordId: "background:sage" },
      { kind: "feats", key: "srd-2024_alert", recordId: "feat:alert" },
      { kind: "features", key: "srd-2024_wizard/spell-mastery-18", recordId: "feature:wizard/spell-mastery-18" },
      { kind: "features", key: "srd-2024_wizard/evoker/x-3", recordId: "feature:wizard/evoker/x-3" },
    ]);
  });

  it("counts on the real SRD data", () => {
    const count = (kind: string) => expectedTargets(readSrdData()).filter((t) => t.kind === kind).length;

    expect(["features", "races", "classes", "subclasses", "backgrounds", "feats"].map(count)).toEqual([186, 9, 12, 12, 4, 20]);
  });
});

it("parseIdentityCsv maps record_id to folder and file", () => {
  const csv = ["﻿record_id,generation_folder,output_filename", "race:elf,races,elf.png", 'class:"x",classes,x.png'].join("\n");

  expect(parseIdentityCsv(csv).get("race:elf")).toEqual({ folder: "races", file: "elf.png" });
  expect(parseIdentityCsv(csv).size).toBe(2);
});
