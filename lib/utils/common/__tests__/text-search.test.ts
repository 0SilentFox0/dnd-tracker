import { describe, expect, it } from "vitest";

import { matchesQuery, normalizeSearchText } from "@/lib/utils/common/text-search";

describe("normalizeSearchText", () => {
  it("знижує регістр, зводить апострофи, стискає пробіли", () => {
    expect(normalizeSearchText("  Сл’ід   ВОГНЮ ")).toBe("сл'ід вогню");
    expect(normalizeSearchText("м`яч")).toBe("м'яч");
    expect(normalizeSearchText("мʼяч")).toBe("м'яч");
  });
});

describe("matchesQuery", () => {
  it("порожній запит збігається з усім", () => {
    expect(matchesQuery(["a"], "  ")).toBe(true);
    expect(matchesQuery([], "")).toBe(true);
  });

  it("шукає підрядок у будь-якому тексті, ігноруючи null", () => {
    expect(matchesQuery([null, "Вогняна куля", undefined], "КУЛЯ")).toBe(true);
    expect(matchesQuery(["Вогняна куля"], "лід")).toBe(false);
  });

  it("не розрізняє типи апострофів", () => {
    expect(matchesQuery(["Дракон'яр"], "дракон’")).toBe(true);
  });
});
