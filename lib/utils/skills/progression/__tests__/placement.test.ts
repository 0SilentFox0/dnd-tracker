import { describe, expect, it } from "vitest";

import { skillPlacements } from "..";
import { RAW } from "./fixtures";

describe("skillPlacements", () => {
  it("місце скіла в деревах: рівні гілки, кола, раса, ультимейт; перше входження виграє", () => {
    const map = skillPlacements([{ id: "a", skills: RAW }, { id: "b", skills: RAW }]);

    expect(map.get("atk-a")).toEqual({ group: 0, label: "Рівень гілки · Просунутий" });
    expect(map.get("o1")).toEqual({ group: 1, label: "Зовнішнє коло" });
    expect(map.get("m1")).toEqual({ group: 2, label: "Середнє коло" });
    expect(map.get("i1")).toEqual({ group: 3, label: "Внутрішнє коло" });
    expect(map.get("r-b")).toEqual({ group: 4, label: "Расове · Основи" });
    expect(map.get("ult")).toEqual({ group: 5, label: "Ультимейт" });
    expect(map.has("nope")).toBe(false);
  });
});
