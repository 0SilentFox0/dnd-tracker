import { describe, expect, it } from "vitest";

import { contentWrite, readContent, toSummary } from "@/lib/server/scenario/page-store";

const now = new Date("2026-10-21T12:00:00Z");

describe("page-store", () => {
  it("readContent: битий JSON → порожній контент", () => {
    expect(readContent({ sections: "nope" })).toEqual({ legend: [], sections: [] });
    expect(readContent({ legend: [], sections: [] })).toEqual({ legend: [], sections: [] });
  });

  it("toSummary серіалізує дату і не пропускає content/searchText", () => {
    const summary = toSummary({ id: "p", kind: "scene", arc: null, title: "t", subtitle: null, status: "ready", sortOrder: 1, characterId: null, version: 3, updatedAt: now, content: {}, searchText: "x" } as never);

    expect(summary.updatedAt).toBe("2026-10-21T12:00:00.000Z");
    expect(summary).not.toHaveProperty("content");
    expect(summary).not.toHaveProperty("searchText");
  });

  it("contentWrite: контент і searchText разом", () => {
    const write = contentWrite("Назва", { legend: [], sections: [] });

    expect(write.content).toEqual({ legend: [], sections: [] });
    expect(write.searchText).toContain("Назва");
  });
});
