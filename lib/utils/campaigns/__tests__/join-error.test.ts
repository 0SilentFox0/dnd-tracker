import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { joinErrorMessage } from "@/lib/utils/campaigns/join-error";

describe("joinErrorMessage", () => {
  it("translates known server errors", () => {
    expect(joinErrorMessage(new Error(API_ERRORS.CAMPAIGN_NOT_FOUND))).toBe("Кампанію не знайдено. Перевірте код запрошення.");
    expect(joinErrorMessage(new Error(API_ERRORS.ALREADY_MEMBER))).toBe("Ви вже є учасником цієї кампанії.");
    expect(joinErrorMessage(new Error(API_ERRORS.CAMPAIGN_NOT_ACTIVE))).toBe("Кампанія неактивна.");
  });

  it("passes other messages through and has a fallback", () => {
    expect(joinErrorMessage(new Error("Boom"))).toBe("Boom");
    expect(joinErrorMessage("x")).toBe("Помилка приєднання до кампанії");
  });
});
