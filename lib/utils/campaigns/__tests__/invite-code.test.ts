import { describe, expect, it } from "vitest";

import { generateInviteCode, INVITE_CODE_LENGTH } from "@/lib/utils/campaigns/invite-code";

describe("generateInviteCode", () => {
  it("завжди 6 символів з 0-9A-Z", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateInviteCode()).toMatch(new RegExp(`^[0-9A-Z]{${INVITE_CODE_LENGTH}}$`));
    }
  });
});
