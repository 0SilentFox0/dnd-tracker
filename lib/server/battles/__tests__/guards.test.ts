import { describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { assertExecutionScope, requireDmMember } from "@/lib/server/battles/guards";
import type { Actor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u1", isDM: true, via: "session", scopes: null } as Actor;

const tx = {};

describe("assertExecutionScope", () => {
  it("інший actor -> 409 ACTOR_MISMATCH", () => {
    expect(() => assertExecutionScope(actor, { actor: { ...actor, userId: "u2" }, tx }, tx)).toThrowError(expect.objectContaining({ status: 409, message: API_ERRORS.ACTOR_MISMATCH }));
  });

  it("інша транзакція -> 409 TX_MISMATCH", () => {
    expect(() => assertExecutionScope(actor, { actor, tx }, {})).toThrowError(expect.objectContaining({ status: 409, message: API_ERRORS.TX_MISMATCH }));
  });

  it("збіг або відсутній execution не кидає", () => {
    expect(() => assertExecutionScope(actor, { actor, tx }, tx)).not.toThrow();
    expect(() => assertExecutionScope(actor, undefined, {})).not.toThrow();
  });
});

describe("requireDmMember", () => {
  const db = (role?: string) => ({ campaignMember: { findUnique: vi.fn().mockResolvedValue(role ? { role } : null) } }) as never;

  it("player -> 403 DM_ONLY", async () => {
    await expect(requireDmMember(db("player"), actor)).rejects.toMatchObject({ status: 403, message: API_ERRORS.DM_ONLY });
    await expect(requireDmMember(db(), actor)).rejects.toMatchObject({ status: 403 });
  });

  it("dm -> ok", async () => {
    await expect(requireDmMember(db("dm"), actor)).resolves.toBeUndefined();
  });
});
