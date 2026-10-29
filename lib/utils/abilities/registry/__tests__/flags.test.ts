import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { describeFlag, FLAG_DEFAULTS, FLAG_FIELDS, FLAG_LABELS, FLAG_REGISTRY } from "@/lib/utils/abilities/registry/effects/flags";

describe("FLAG_REGISTRY", () => {
  it("one entry feeds labels, fields and editor defaults for every flag", () => {
    const keys = Object.keys(FLAG_REGISTRY).sort();

    expect(Object.keys(FLAG_LABELS).sort()).toEqual(keys);
    expect(Object.keys(FLAG_FIELDS).sort()).toEqual(keys);
    expect(Object.keys(FLAG_DEFAULTS).sort()).toEqual(keys);
    expect(new Set(Object.values(FLAG_LABELS).map((l) => l.message)).size).toBe(keys.length);
  });

  it("every default field name is described in fields", () => {
    for (const [flag, defaults] of Object.entries(FLAG_DEFAULTS)) {
      const names = FLAG_FIELDS[flag as keyof typeof FLAG_FIELDS].map((f) => f.name);

      for (const key of Object.keys(defaults)) expect(names, flag).toContain(key);
    }
  });

  it("describes flags through the registry", () => {
    expect(textOf(describeFlag({ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 }))).toBe("імунітет: fire");
    expect(textOf(describeFlag({ kind: "flag", flag: "piercingShot" }))).toContain("на лінії");
    expect(textOf(describeFlag({ kind: "flag", flag: "advantage", attackKind: "melee" }))).toBe("перевага на ближні атаки");
  });
});
