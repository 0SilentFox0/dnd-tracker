import { describe, expect, it } from "vitest";

import { removedSlideUrls } from "../deck-files";

const s = (id: string, imageUrl: string) => ({ id, imageUrl });

describe("removedSlideUrls", () => {
  it("лише зниклі картинки, без дублікатів і без тих, що треба зберегти", () => {
    const before = [s("a", "u1"), s("b", "u2"), s("c", "u2"), s("d", "u3"), s("e", "u4")];

    const after = [s("a", "u1")];

    expect(removedSlideUrls(before, after, ["u3"]).sort()).toEqual(["u2", "u4"]);
  });

  it("картинка лишилася в іншому слайді — не видаляється", () => {
    expect(removedSlideUrls([s("a", "u1"), s("b", "u2")], [s("c", "u2")], [])).toEqual(["u1"]);
  });
});
