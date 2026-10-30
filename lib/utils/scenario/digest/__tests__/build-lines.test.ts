import { describe, expect, it } from "vitest";

import { type DigestPage, pageLine } from "@/lib/utils/scenario/digest/build-lines";

const page: DigestPage = {
  id: "p1",
  title: "Cathedral",
  arc: "Act 1",
  sortOrder: 0,
  llm: null,
  sections: [
    { title: "Bells", played: true, lead: "The bells stop" },
    { title: "Crypt", played: false, lead: "" },
  ],
  entities: ["Biara", "Beatrice"],
};

describe("pageLine", () => {
  it("level 0 has leads, played marks and entities", () => {
    expect(pageLine(page, 0)).toBe("- Cathedral [p1] (Act 1): § Bells ✓ — The bells stop; § Crypt; entities: Biara, Beatrice");
  });

  it("level 1 drops leads", () => {
    expect(pageLine(page, 1)).toBe("- Cathedral [p1] (Act 1): § Bells ✓; § Crypt; entities: Biara, Beatrice");
  });

  it("level 2 keeps title, arc and entities", () => {
    expect(pageLine(page, 2)).toBe("- Cathedral [p1] (Act 1): entities: Biara, Beatrice");
  });

  it("level 3 keeps title and arc", () => {
    expect(pageLine(page, 3)).toBe("- Cathedral [p1] (Act 1)");
  });

  it("omits arc and empty parts", () => {
    expect(pageLine({ ...page, arc: null, sections: [], entities: [] }, 0)).toBe("- Cathedral [p1]");
  });

  it.each([0, 1, 2, 3] as const)("llm summary overrides at level %i", (level) => {
    expect(pageLine({ ...page, llm: { digest: "Sum", stale: false } }, level)).toBe("- Cathedral [p1]: Sum");
    expect(pageLine({ ...page, llm: { digest: "Sum", stale: true } }, level)).toBe("- Cathedral [p1]: Sum (stale)");
  });
});
