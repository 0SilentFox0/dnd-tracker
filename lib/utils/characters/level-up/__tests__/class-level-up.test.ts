import { describe, expect, it } from "vitest";

import { nextClassEntries } from "../class-level-up";

describe("nextClassEntries", () => {
  it("наявний клас: рівень +1", () => {
    expect(nextClassEntries([{ classId: "a", level: 2 }], { classId: "a" })).toEqual([{ classId: "a", level: 3, subclassId: undefined }]);
  });

  it("новий клас додається в кінець", () => {
    expect(nextClassEntries([{ classId: "a", level: 2 }], { classId: "b" })).toEqual([
      { classId: "a", level: 2 },
      { classId: "b", level: 1, subclassId: undefined },
    ]);
  });

  it("підклас з pick; старий зберігається, якщо не переданий", () => {
    expect(nextClassEntries([{ classId: "a", level: 2 }], { classId: "a", subclassId: "s" })[0].subclassId).toBe("s");
    expect(nextClassEntries([{ classId: "a", level: 2, subclassId: "s" }], { classId: "a" })[0].subclassId).toBe("s");
  });

  it("наявний підклас не підміняється", () => {
    expect(nextClassEntries([{ classId: "a", level: 3, subclassId: "s" }], { classId: "a", subclassId: "t" })[0].subclassId).toBe("s");
  });
});
