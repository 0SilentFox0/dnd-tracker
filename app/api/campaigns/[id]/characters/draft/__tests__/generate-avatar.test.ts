import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateDraftAvatar } from "../avatar/generate-avatar";
import { guardDraftAi, limitDraftAi } from "../draft-ai-guard";

import { pickDmImageModel } from "@/lib/ai/dm-model";
import { AiImageError, generateAvatarImage } from "@/lib/ai/images";
import { API_ERRORS } from "@/lib/constants/api-errors";

vi.mock("../draft-ai-guard", () => ({ guardDraftAi: vi.fn(), limitDraftAi: vi.fn() }));
vi.mock("@/lib/ai/dm-model", () => ({ pickDmImageModel: vi.fn() }));
vi.mock("@/lib/ai/images", () => {
  class AiImageError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }

  return { AiImageError, generateAvatarImage: vi.fn() };
});

const body = { name: "Ліра", race: "Ельф", archetype: "mage", class: "Чародій" };

const post = (payload: unknown = body, signal?: AbortSignal) => generateDraftAvatar(new Request("http://x", { method: "POST", body: JSON.stringify(payload), signal }), "camp");

describe("generateDraftAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guardDraftAi).mockResolvedValue({ userId: "u1" });
    vi.mocked(limitDraftAi).mockResolvedValue(null);
    vi.mocked(pickDmImageModel).mockResolvedValue({ userId: "dm", provider: "google", model: "m" });
    vi.mocked(generateAvatarImage).mockResolvedValue({ url: "https://x/a.webp" });
  });

  it("returns the generated url and rate-limits under the draft-avatar scope", async () => {
    const res = await post();

    expect(await res.json()).toEqual({ url: "https://x/a.webp" });
    expect(limitDraftAi).toHaveBeenCalledWith("camp", "u1", "draft-avatar");
    expect(vi.mocked(generateAvatarImage).mock.calls[0][0]).toMatchObject({ campaignId: "camp", userId: "dm", provider: "google", model: "m" });
  });

  it("passes the request abort signal to the image call", async () => {
    const controller = new AbortController();

    await post(body, controller.signal);

    const passed = vi.mocked(generateAvatarImage).mock.calls[0][0].abortSignal;

    expect(passed?.aborted).toBe(false);
    controller.abort();
    expect(passed?.aborted).toBe(true);
  });

  it("guard denial short-circuits before the key is used", async () => {
    vi.mocked(guardDraftAi).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await post()).status).toBe(403);
    expect(pickDmImageModel).not.toHaveBeenCalled();
  });

  it("invalid body is 400 and does not consume the limit", async () => {
    expect((await post({ ...body, archetype: "bard-king" })).status).toBe(400);
    expect(limitDraftAi).not.toHaveBeenCalled();
  });

  it("rate limit exhausted is passed through", async () => {
    vi.mocked(limitDraftAi).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 429 }));

    expect((await post()).status).toBe(429);
    expect(generateAvatarImage).not.toHaveBeenCalled();
  });

  it("400 when the DM has no image model", async () => {
    vi.mocked(pickDmImageModel).mockResolvedValue(null);

    const res = await post();

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(API_ERRORS.AI_NOT_CONFIGURED_FOR_PLAYERS);
  });

  it("maps AiImageError to its status", async () => {
    vi.mocked(generateAvatarImage).mockRejectedValue(new AiImageError(API_ERRORS.AI_IMAGE_REJECTED, 422));

    const res = await post();

    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe(API_ERRORS.AI_IMAGE_REJECTED);
  });
});
