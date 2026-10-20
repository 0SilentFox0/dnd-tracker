import { describe, expect, it } from "vitest";

import { battleTrackTitle, parseBattleTitle, planBattleTitles } from "../battle-titles";

const refs = (titles: string[]) => titles.map((title, i) => ({ id: `t${i}`, title }));

const apply = (titles: string[]) => {
  const changes = new Map(planBattleTitles(refs(titles)).map((c) => [c.id, c.to]));

  return titles.map((t, i) => changes.get(`t${i}`) ?? t);
};

describe("parseBattleTitle", () => {
  it("раса і примітка; інші треки — null", () => {
    expect(parseBattleTitle("Люди - Битва")).toEqual({ faction: "Люди", note: null });
    expect(parseBattleTitle("Темні ельфи - Битва 2")).toEqual({ faction: "Темні ельфи", note: null });
    expect(parseBattleTitle("Нейтральні - Битва 3 (HoMM III)")).toEqual({ faction: "Нейтральні", note: "(HoMM III)" });
    expect(parseBattleTitle("Демони - Битва (альтернативна)")).toEqual({ faction: "Демони", note: "(альтернативна)" });
    expect(parseBattleTitle("Люди - Місто")).toBeNull();
    expect(parseBattleTitle("Битва")).toBeNull();
  });
});

describe("battleTrackTitle", () => {
  it("номер лише коли заданий", () => {
    expect(battleTrackTitle("Люди", null, null)).toBe("Люди - Битва");
    expect(battleTrackTitle("Люди", 2, null)).toBe("Люди - Битва 2");
    expect(battleTrackTitle("Нейтральні", 1, "(HoMM III)")).toBe("Нейтральні - Битва 1 (HoMM III)");
  });
});

describe("planBattleTitles", () => {
  const library = ["Люди - Місто", "Люди - Битва", "Ельфи - Битва", "Люди - Битва 2", "Демони - Битва", "Демони - Битва 2", "Демони - Битва (альтернативна)"];

  it("нумерує лише однакові назви (раса + примітка), унікальні лишає без номера", () => {
    expect(apply(library)).toEqual(["Люди - Місто", "Люди - Битва 1", "Ельфи - Битва", "Люди - Битва 2", "Демони - Битва 1", "Демони - Битва 2", "Демони - Битва (альтернативна)"]);
  });

  it("однакова примітка нумерується окремо від треків без примітки", () => {
    expect(apply(["Нейтральні - Битва", "Нейтральні - Битва (альфа-версія)", "Нейтральні - Битва 1 (HoMM III)", "Нейтральні - Битва 2 (HoMM III)"])).toEqual([
      "Нейтральні - Битва",
      "Нейтральні - Битва (альфа-версія)",
      "Нейтральні - Битва 1 (HoMM III)",
      "Нейтральні - Битва 2 (HoMM III)",
    ]);
  });

  it("ідемпотентно", () => {
    expect(planBattleTitles(refs(apply(library)))).toEqual([]);
  });

  it("повертає лише зміни зі старою й новою назвою", () => {
    expect(planBattleTitles(refs(["Люди - Битва", "Люди - Битва 2"]))).toEqual([{ id: "t0", from: "Люди - Битва", to: "Люди - Битва 1" }]);
  });
});
