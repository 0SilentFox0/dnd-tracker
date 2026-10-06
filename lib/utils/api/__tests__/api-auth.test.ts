import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuth, requireAuthUser, requireCampaignAccess, requireDM, validateCampaignOwnership } from "../api-auth";

import { CampaignRole, type CampaignRoleValue } from "@/lib/constants/campaigns";

const getUser = vi.hoisted(() => vi.fn());

const getClaims = vi.hoisted(() => vi.fn());

const findCampaign = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getClaims } }) }));
vi.mock("@/lib/db", () => ({ prisma: { campaign: { findUnique: findCampaign } } }));

const campaign = (role?: CampaignRoleValue) => ({
  id: "c1",
  maxLevel: 20,
  xpMultiplier: 2,
  members: role ? [{ userId: "u1", role }] : [],
});

const statusOf = (result: unknown) => (result instanceof NextResponse ? result.status : 200);

describe("api-auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.c", user_metadata: { name: "A" } } } });
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1", email: "a@b.c" } } });
  });

  describe("requireAuth", () => {
    it("без сесії — 401", async () => {
      getClaims.mockResolvedValue({ data: null, error: null });

      expect(statusOf(await requireAuth())).toBe(401);
    });

    it("невалідний токен — 401", async () => {
      getClaims.mockResolvedValue({ data: null, error: new Error("invalid JWT") });

      expect(statusOf(await requireAuth())).toBe(401);
    });

    it("із сесією — userId з claims без запиту до Supabase Auth", async () => {
      expect(await requireAuth()).toEqual({ userId: "u1" });
      expect(getUser).not.toHaveBeenCalled();
    });
  });

  describe("requireAuthUser", () => {
    it("без сесії — 401", async () => {
      getUser.mockResolvedValue({ data: { user: null } });

      expect(statusOf(await requireAuthUser())).toBe(401);
    });

    it("повертає email і user_metadata з Supabase Auth", async () => {
      expect(await requireAuthUser()).toEqual({
        userId: "u1",
        authUser: { id: "u1", email: "a@b.c", user_metadata: { name: "A" } },
      });
    });
  });

  describe("requireCampaignAccess", () => {
    it("без сесії — 401 без запиту до БД", async () => {
      getClaims.mockResolvedValue({ data: null, error: null });

      expect(statusOf(await requireCampaignAccess("c1"))).toBe(401);
      expect(findCampaign).not.toHaveBeenCalled();
    });

    it("шукає членство лише поточного користувача", async () => {
      findCampaign.mockResolvedValue(campaign(CampaignRole.PLAYER));

      await requireCampaignAccess("c1");

      expect(findCampaign).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "c1" }, include: { members: { where: { userId: "u1" } } } }),
      );
    });

    it("неіснуюча кампанія — 404", async () => {
      findCampaign.mockResolvedValue(null);

      expect(statusOf(await requireCampaignAccess("c1"))).toBe(404);
    });

    it("не член — 403", async () => {
      findCampaign.mockResolvedValue(campaign());

      expect(statusOf(await requireCampaignAccess("c1"))).toBe(403);
    });

    it("гравець — доступ і дані кампанії", async () => {
      findCampaign.mockResolvedValue(campaign(CampaignRole.PLAYER));

      expect(await requireCampaignAccess("c1")).toMatchObject({
        userId: "u1",
        campaign: { id: "c1", maxLevel: 20, members: [{ userId: "u1", role: CampaignRole.PLAYER }] },
      });
    });
  });

  describe("requireDM", () => {
    it("гравець — 403", async () => {
      findCampaign.mockResolvedValue(campaign(CampaignRole.PLAYER));

      expect(statusOf(await requireDM("c1"))).toBe(403);
    });

    it("DM — доступ", async () => {
      findCampaign.mockResolvedValue(campaign(CampaignRole.DM));

      expect(statusOf(await requireDM("c1"))).toBe(200);
    });

    it("не член — 403", async () => {
      findCampaign.mockResolvedValue(campaign());

      expect(statusOf(await requireDM("c1"))).toBe(403);
    });
  });

  describe("validateCampaignOwnership", () => {
    it("немає запису — 404", () => {
      expect(validateCampaignOwnership(null, "c1")?.status).toBe(404);
    });

    it("запис іншої кампанії — 403", () => {
      expect(validateCampaignOwnership({ campaignId: "c2" }, "c1")?.status).toBe(403);
    });

    it("запис цієї кампанії — null", () => {
      expect(validateCampaignOwnership({ campaignId: "c1" }, "c1")).toBeNull();
    });
  });
});
