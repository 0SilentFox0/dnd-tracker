import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireCampaignAccess: vi.fn(), requireDM: vi.fn() }));

const tx = vi.hoisted(() => ({
  $executeRaw: vi.fn(),
  character: { count: vi.fn(), create: vi.fn() },
  characterInventory: { create: vi.fn() },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    character: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    race: { findFirst: vi.fn(async () => null) },
    campaign: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

vi.mock("@/lib/supabase/avatar-storage", () => ({ resolveAvatarForPersistence: vi.fn(async (a: string | undefined) => ({ ok: true, avatar: a })) }));

const gen = vi.hoisted(() => ({ generateObject: vi.fn(), pickDmTextModel: vi.fn(), checkRateLimit: vi.fn() }));

vi.mock("ai", async (orig) => ({ ...(await orig<typeof import("ai")>()), generateObject: gen.generateObject }));
vi.mock("@/lib/ai/dm-model", () => ({ pickDmTextModel: gen.pickDmTextModel }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: gen.checkRateLimit }));

const access = (userId: string, role: "dm" | "player") => ({ userId, isDM: role === "dm", campaign: { id: "camp", maxLevel: 20, allowPlayerEdit: true, members: [{ userId, role }] } }) as never;

const scores = { strength: 15, dexterity: 14, constitution: 13, intelligence: 12, wisdom: 10, charisma: 8 };

const draft = { name: "Ліра", race: "Ельф", class: "Воїн", archetype: "warrior", method: "standard", ...scores };

const json = (body: unknown, method = "POST") => new Request("http://x", { method, body: JSON.stringify(body) });

const createRoute = () => import("@/app/api/campaigns/[id]/characters/draft/route");

const ctx = { params: Promise.resolve({ id: "camp", characterId: "a" }) };

describe("player draft API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("u1", "player"));
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access("dm", "dm"));
    tx.character.count.mockResolvedValue(0);
    vi.mocked(prisma.character.count).mockResolvedValue(0);
    tx.character.create.mockImplementation(async ({ data }: { data: object }) => ({ id: "new", ...data }));
    gen.checkRateLimit.mockResolvedValue({ allowed: true, count: 1, limit: 10, retryAfterSeconds: 600 });
  });

  describe("POST /draft", () => {
    it("створює PENDING-чернетку з ініціативою героя, під локом", async () => {
      const res = await (await createRoute()).POST(json(draft), { params: Promise.resolve({ id: "camp" }) });

      expect(res.status).toBe(200);
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(tx.character.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: "pending", controlledBy: "u1", type: "player", initiative: 10, level: 1 }) });
      expect(tx.characterInventory.create).toHaveBeenCalled();
    });

    it("другий персонаж — 400 (перевірка всередині лока)", async () => {
      tx.character.count.mockResolvedValue(1);

      const res = await (await createRoute()).POST(json(draft), { params: Promise.resolve({ id: "camp" }) });

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(API_ERRORS.DRAFT_ALREADY_EXISTS);
      expect(tx.character.create).not.toHaveBeenCalled();
    });

    it("відмова до завантаження аватара: другий персонаж не лишає файлів", async () => {
      vi.mocked(prisma.character.count).mockResolvedValue(1);

      const res = await (await createRoute()).POST(json({ ...draft, avatar: "data:image/png;base64,AAAA" }), { params: Promise.resolve({ id: "camp" }) });

      expect(res.status).toBe(400);
      expect(resolveAvatarForPersistence).not.toHaveBeenCalled();
    });

    it("характеристики 18/18/18 — 400", async () => {
      const res = await (await createRoute()).POST(json({ ...draft, method: "pointBuy", strength: 18, dexterity: 18, constitution: 18, intelligence: 8, wisdom: 8, charisma: 8 }), { params: Promise.resolve({ id: "camp" }) });

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(API_ERRORS.DRAFT_INVALID_SCORES);
      expect(tx.character.create).not.toHaveBeenCalled();
    });

    it("ДМ не створює чернетку — 400", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));

      expect((await (await createRoute()).POST(json(draft), { params: Promise.resolve({ id: "camp" }) })).status).toBe(400);
    });
  });

  describe("PATCH /draft", () => {
    const patchDraft = async (body: unknown) => (await import("@/app/api/campaigns/[id]/characters/[characterId]/draft/route")).PATCH(json(body, "PATCH"), ctx);

    beforeEach(() => {
      vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "u1", status: "pending", race: "Ельф" } as never);
      vi.mocked(prisma.character.update).mockResolvedValue({ id: "a" } as never);
    });

    it("записує цілі, очищає порожні поля null", async () => {
      const res = await patchDraft({ ...draft, goals: [{ text: "Помста", kind: "main" }] });

      expect(res.status).toBe(200);

      const data = vi.mocked(prisma.character.update).mock.calls[0][0].data as Record<string, unknown>;

      expect(data.goals).toEqual([expect.objectContaining({ text: "Помста", kind: "main", author: "player" })]);
      expect(data.alignment).toBeNull();
      expect(data.background).toBeNull();
      expect(data).not.toHaveProperty("spellSlots");
    });

    it("зберігає id незмінених цілей і цілі DM, нові отримують свіжі id", async () => {
      vi.mocked(prisma.character.findUnique).mockResolvedValue({
        id: "a",
        campaignId: "camp",
        controlledBy: "u1",
        status: "pending",
        race: "Ельф",
        goals: [
          { id: "g1", text: "Помста", kind: "main", status: "active", author: "player" },
          { id: "g2", text: "Знайти брата", kind: "personal", status: "active", author: "dm" },
        ],
      } as never);

      await patchDraft({ ...draft, goals: [{ text: "Помста", kind: "main" }, { text: "Нова", kind: "inner" }] });

      const goals = (vi.mocked(prisma.character.update).mock.calls[0][0].data as { goals: Array<{ id: string; text: string; author: string }> }).goals;

      expect(goals.map((g) => [g.text, g.author])).toEqual([["Помста", "player"], ["Нова", "player"], ["Знайти брата", "dm"]]);
      expect(goals[0].id).toBe("g1");
      expect(goals[1].id).not.toBe("g1");
      expect(goals[2].id).toBe("g2");
    });

    it("порожній avatar очищає, відсутній — не чіпає", async () => {
      await patchDraft({ ...draft, avatar: "" });
      expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toHaveProperty("avatar", "");

      await patchDraft(draft);
      expect(vi.mocked(prisma.character.update).mock.calls[1][0].data.avatar).toBeUndefined();
    });

    it("зміна раси перераховує слоти заклинань", async () => {
      await patchDraft({ ...draft, race: "Людина" });

      expect(prisma.race.findFirst).toHaveBeenCalled();
      expect(vi.mocked(prisma.character.update).mock.calls[0][0].data).toHaveProperty("spellSlots");
    });

    it("чужа чернетка — 403, схвалений — 400, 18/18/18 — 400", async () => {
      vi.mocked(prisma.character.findUnique).mockResolvedValueOnce({ id: "a", campaignId: "camp", controlledBy: "other", status: "pending", race: "Ельф" } as never);
      expect((await patchDraft(draft)).status).toBe(403);

      vi.mocked(prisma.character.findUnique).mockResolvedValueOnce({ id: "a", campaignId: "camp", controlledBy: "u1", status: "active", race: "Ельф" } as never);
      expect((await patchDraft(draft)).status).toBe(400);

      expect((await patchDraft({ ...draft, strength: 18, dexterity: 18, constitution: 18 })).status).toBe(400);
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe("загальний PATCH персонажа", () => {
    const generalPatch = async (body: unknown) => (await import("@/app/api/campaigns/[id]/characters/[characterId]/route")).PATCH(json(body, "PATCH"), ctx);

    it("власник чернетки не обходить валідацію через загальний PATCH — 403", async () => {
      vi.mocked(prisma.character.findUnique).mockResolvedValue({ id: "a", campaignId: "camp", controlledBy: "u1", status: "pending", level: 1, race: "Ельф" } as never);

      const res = await generalPatch({ strength: 30 });

      expect(res.status).toBe(403);
      expect(prisma.character.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /review", () => {
    const review = async (body: unknown) => (await import("@/app/api/campaigns/[id]/characters/[characterId]/review/route")).POST(json(body), ctx);

    beforeEach(() => {
      vi.mocked(prisma.character.findUnique).mockResolvedValue({ campaignId: "camp", status: "pending" } as never);
      vi.mocked(prisma.character.update).mockResolvedValue({ id: "a", status: "active" } as never);
    });

    it("гравець — 403", async () => {
      vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }) as never);

      expect((await review({ action: "approve" })).status).toBe(403);
      expect(prisma.character.update).not.toHaveBeenCalled();
    });

    it("ДМ схвалює — статус active", async () => {
      expect((await review({ action: "approve" })).status).toBe(200);
      expect(prisma.character.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "active", reviewNote: null } }));
    });

    it("повернення без коментаря — 400, з коментарем — зберігає нотатку", async () => {
      expect((await review({ action: "return", note: " " })).status).toBe(400);
      expect((await review({ action: "return", note: "Змініть расу" })).status).toBe(200);
      expect(prisma.character.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reviewNote: "Змініть расу" } }));
    });
  });

  describe("POST /draft/backstory", () => {
    const backstory = async () =>
      (await import("@/app/api/campaigns/[id]/characters/draft/backstory/route")).POST(json({ name: "Ліра", race: "Ельф", archetype: "mage", class: "Маг" }), { params: Promise.resolve({ id: "camp" }) });

    beforeEach(() => {
      vi.mocked(prisma.character.count).mockResolvedValue(0);
      gen.pickDmTextModel.mockResolvedValue({});
      gen.generateObject.mockResolvedValue({ object: { background: "Історія", goals: [{ text: "Мета", kind: "main" }] } });
    });

    it("гравець без активного героя отримує текст", async () => {
      const res = await backstory();

      expect(res.status).toBe(200);
      expect(gen.checkRateLimit).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", scope: "draft-backstory", battleId: "camp", limit: 10, windowSeconds: 600 }));
    });

    it("гравець з активним героєм — 403, ключ DM не використано", async () => {
      vi.mocked(prisma.character.count).mockResolvedValue(1);

      expect((await backstory()).status).toBe(403);
      expect(gen.generateObject).not.toHaveBeenCalled();
    });

    it("ДМ може викликати без обмеження на героя", async () => {
      vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access("dm", "dm"));
      vi.mocked(prisma.character.count).mockResolvedValue(3);

      expect((await backstory()).status).toBe(200);
    });

    it("ліміт викликів вичерпано — 429", async () => {
      gen.checkRateLimit.mockResolvedValue({ allowed: false, count: 10, limit: 10, retryAfterSeconds: 120 });

      expect((await backstory()).status).toBe(429);
      expect(gen.generateObject).not.toHaveBeenCalled();
    });

    it("ДМ не підключив AI — 400", async () => {
      gen.pickDmTextModel.mockResolvedValue(null);

      const res = await backstory();

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(API_ERRORS.AI_NOT_CONFIGURED_FOR_PLAYERS);
    });
  });
});
