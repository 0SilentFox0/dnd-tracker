import { describe, expect, it } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { battleErrorResponse } from "@/lib/server/battles/run-mutation";
import { ContentError } from "@/lib/server/content/errors";
import { BattleOperationError } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleAccessError, BattleConflictError, BattleRuleError } from "@/lib/utils/battle/store";

describe("battleErrorResponse translates at the boundary", () => {
  it("keeps code and adds errorKey for a rule error", async () => {
    const res = battleErrorResponse(new BattleRuleError("invalid_dice", API_ERRORS.FORBIDDEN));

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ code: "invalid_dice", error: API_ERRORS.FORBIDDEN, errorKey: API_ERRORS.FORBIDDEN });
  });

  it("keeps code, version and 409 for a conflict", async () => {
    const res = battleErrorResponse(new BattleConflictError(7));

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "conflict", version: 7, errorKey: expect.any(String) });
  });

  it("translates operation error issues", async () => {
    const res = battleErrorResponse(new BattleOperationError(400, API_ERRORS.INVALID_BODY, [{ message: API_ERRORS.FORBIDDEN, path: ["x"] }]));

    const body = await res.json();

    expect(body.errorKey).toBe(API_ERRORS.INVALID_BODY);
    expect(body.issues[0].message).toBe(API_ERRORS.FORBIDDEN);
  });

  it("passes ContentError params", async () => {
    const res = battleErrorResponse(new ContentError(API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL, 400, undefined, { min: 1, max: 5 }));

    expect((await res.json()).error).toBe(`${API_ERRORS.INITIATIVE_OUT_OF_RANGE_DETAIL} {"min":1,"max":5}`);
  });

  it("translates access errors and the internal fallback", async () => {
    expect((await battleErrorResponse(new BattleAccessError(403, API_ERRORS.FORBIDDEN)).json()).errorKey).toBe(API_ERRORS.FORBIDDEN);
    expect((await battleErrorResponse(new Error("boom")).json()).errorKey).toBe(API_ERRORS.INTERNAL);
  });
});
