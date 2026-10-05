import { describe, expect, it } from "vitest";

import { pickHighestPerLine } from "@/lib/utils/abilities/build/resolve";

describe("pickHighestPerLine", () => {
it("рівні гілки з levelNode групуються за гілкою навіть без слова рівня в назві", () => {
  const src = (id: string, level: string, levelNode: boolean) => ({ item: id, source: { type: "skill" as const, id, name: `Скіл ${id}`, line: { mainSkillId: "attack", level, levelNode } } });

  const picked = pickHighestPerLine([src("a", "basic", true), src("b", "advanced", true), src("c", "basic", false)]);

  expect(picked.map((p) => p.item).sort()).toEqual(["b", "c"]);
});

it("старі знімки без levelNode — фолбек на назву", () => {
  const picked = pickHighestPerLine([
    { item: "a", source: { type: "skill" as const, id: "a", name: "Напад — Основи", line: { mainSkillId: "attack", level: "basic" } } },
    { item: "b", source: { type: "skill" as const, id: "b", name: "Напад — Експерт", line: { mainSkillId: "attack", level: "expert" } } },
  ]);

  expect(picked.map((p) => p.item)).toEqual(["b"]);
});
});
