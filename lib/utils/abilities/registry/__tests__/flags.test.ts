import { describe, expect, it } from "vitest";

import { ukT } from "../../__tests__/describe-fixtures";

import { describeFlag, FLAG_DEFAULTS, FLAG_FIELDS, FLAG_LABELS, FLAG_REGISTRY } from "@/lib/utils/abilities/registry/effects/flags";
import { renderSegments } from "@/lib/utils/abilities/segments";

describe("FLAG_REGISTRY", () => {
  it("one entry feeds labels, fields and editor defaults for every flag", () => {
    const keys = Object.keys(FLAG_REGISTRY).sort();

    expect(Object.keys(FLAG_LABELS).sort()).toEqual(keys);
    expect(Object.keys(FLAG_FIELDS).sort()).toEqual(keys);
    expect(Object.keys(FLAG_DEFAULTS).sort()).toEqual(keys);
    expect(new Set(Object.values(FLAG_LABELS)).size).toBe(keys.length);
  });

  it("every default field name is described in fields", () => {
    for (const [flag, defaults] of Object.entries(FLAG_DEFAULTS)) {
      const names = FLAG_FIELDS[flag as keyof typeof FLAG_FIELDS].map((f) => f.name);

      for (const key of Object.keys(defaults)) expect(names, flag).toContain(key);
    }
  });

  it("describes flags through the registry", async () => {
    const t = await ukT();

    const text = (e: Parameters<typeof describeFlag>[0]) => renderSegments(t, describeFlag(e)).join(" ");

    expect(text({ kind: "flag", flag: "resistance", damageType: "fire", percent: 100 })).toBe("імунітет: Вогонь");
    expect(text({ kind: "flag", flag: "piercingShot" })).toContain("на лінії");
    expect(text({ kind: "flag", flag: "advantage", attackKind: "melee" })).toBe("перевага на ближні атаки");
  });
});
