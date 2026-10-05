import { describe, expect, it } from "vitest";

import { joinErrorMessage } from "@/lib/utils/campaigns/join-error";

describe("joinErrorMessage", () => {
  it("translates known server errors", () => {
    expect(joinErrorMessage(new Error("Campaign not found"))).toBe("Кампанію не знайдено. Перевірте код запрошення.");
    expect(joinErrorMessage(new Error("Already a member of this campaign"))).toBe("Ви вже є учасником цієї кампанії.");
    expect(joinErrorMessage(new Error("Campaign is not active"))).toBe("Кампанія неактивна.");
  });

  it("passes other messages through and has a fallback", () => {
    expect(joinErrorMessage(new Error("Boom"))).toBe("Boom");
    expect(joinErrorMessage("x")).toBe("Помилка приєднання до кампанії");
  });
});
