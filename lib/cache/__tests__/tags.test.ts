import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidateTag = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidateTag }));

import { cacheTags, invalidateReference, ReferenceKind } from "../tags";

describe("cacheTags", () => {
  it("теги довідкових даних прив'язані до кампанії", () => {
    expect(cacheTags.spells("c1")).toBe("spells-c1");
    expect(cacheTags.mainSkills("c1")).toBe("main-skills-c1");
    expect(cacheTags.skills("c1")).toBe("skills-c1");
    expect(cacheTags.units("c1")).toBe("units-c1");
    expect(cacheTags.races("c1")).toBe("races-c1");
  });
});

describe("invalidateReference", () => {
  beforeEach(() => revalidateTag.mockClear());

  it("скидає тег одразу (expire: 0), без stale-while-revalidate", () => {
    invalidateReference(ReferenceKind.SPELLS, "c1");

    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith("spells-c1", { expire: 0 });
  });

  it("приймає кілька видів", () => {
    invalidateReference([ReferenceKind.RACES, ReferenceKind.UNITS], "c1");

    expect(revalidateTag.mock.calls).toEqual([
      ["races-c1", { expire: 0 }],
      ["units-c1", { expire: 0 }],
    ]);
  });
});
