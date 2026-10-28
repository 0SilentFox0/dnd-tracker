import { describe, expect, it } from "vitest";

import { pageOf } from "@/lib/utils/api/page-of";

describe("pageOf", () => {
  it("first page with more rows", () => {
    expect(pageOf([1, 2, 3], 0, 2)).toEqual({ items: [1, 2], hasMore: true, nextOffset: 2 });
  });

  it("middle page offsets the cursor", () => {
    expect(pageOf([5, 6, 7], 4, 2)).toEqual({ items: [5, 6], hasMore: true, nextOffset: 6 });
  });

  it("last page has no next offset", () => {
    expect(pageOf([8, 9], 6, 2)).toEqual({ items: [8, 9], hasMore: false, nextOffset: null });
    expect(pageOf([], 0, 2)).toEqual({ items: [], hasMore: false, nextOffset: null });
  });
});
