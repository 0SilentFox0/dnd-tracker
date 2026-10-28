import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { Translator } from "@/lib/i18n/translator";
import { joinErrorMessage } from "@/lib/utils/campaigns/join-error";

const t = Object.assign((key: string) => `t:${key}`, { has: () => true, raw: () => ({}) }) as Translator;

describe("joinErrorMessage", () => {
  it("recognizes known server errors by message", () => {
    expect(joinErrorMessage(new Error(API_ERRORS.CAMPAIGN_NOT_FOUND), t)).toBe("t:common.joinErrors.campaignNotFound");
    expect(joinErrorMessage(new Error(API_ERRORS.ALREADY_MEMBER), t)).toBe("t:common.joinErrors.alreadyMember");
    expect(joinErrorMessage(new Error(API_ERRORS.CAMPAIGN_NOT_ACTIVE), t)).toBe("t:common.joinErrors.campaignNotActive");
  });

  it("recognizes known server errors by errorKey, even when the message is translated", () => {
    const err = Object.assign(new Error("Campaign not found"), { errorKey: API_ERRORS.CAMPAIGN_NOT_FOUND });

    expect(joinErrorMessage(err, t)).toBe("t:common.joinErrors.campaignNotFound");
  });

  it("passes other messages through and has a fallback", () => {
    expect(joinErrorMessage(new Error("Boom"), t)).toBe("Boom");
    expect(joinErrorMessage("x", t)).toBe("t:common.joinErrors.failed");
  });
});
