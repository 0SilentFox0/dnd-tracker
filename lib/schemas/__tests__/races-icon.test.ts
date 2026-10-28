import { describe, expect, it } from "vitest";

import { updateRaceSchema } from "@/lib/schemas";

describe("races icon", () => {
  it("приймає URL і порожнє значення", () => {
    expect(updateRaceSchema.parse({ icon: "https://x/elf.png" }).icon).toBe("https://x/elf.png");
    expect(updateRaceSchema.parse({ icon: "" }).icon).toBeNull();
  });

  it("відхиляє data: URL (base64 у колонці роздуло б кожну відповідь)", () => {
    expect(() => updateRaceSchema.parse({ icon: "data:image/png;base64,AAAA" })).toThrow();
  });

  it("повідомлення — ключі каталогу", () => {
    expect(updateRaceSchema.safeParse({ icon: "data:image/png;base64,AAAA" }).error?.issues[0].message).toBe("races.validation.iconUrl");
    expect(updateRaceSchema.safeParse({ color: "red" }).error?.issues[0].message).toBe("races.validation.color");
  });
});
