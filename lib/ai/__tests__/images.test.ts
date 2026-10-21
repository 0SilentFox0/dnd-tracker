import { APICallError, NoImageGeneratedError } from "ai";
import { MockImageModelV4 } from "ai/test";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateSlideImage } from "../images";

import { API_ERRORS } from "@/lib/constants/api-errors";

const upload = vi.fn();

const generateImageModel = vi.hoisted(() => ({ model: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/credentials", () => ({ loadApiKey: vi.fn(async () => "sk-SECRET-key") }));
vi.mock("@/lib/ai/settings", () => ({ getAiSettings: vi.fn(async () => ({ instructions: "Темне фентезі" })) }));
vi.mock("@/lib/ai/providers", () => ({ createImageModel: vi.fn(() => generateImageModel.model) }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ ensureSlidesBucket: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/scene-slides/${p}` } }) }) } }),
}));

const input = { campaignId: "camp1", userId: "u1", prompt: "Таверна", provider: "openai" as const, model: "gpt-image-2", aspect: "16:9" as const, useCampaignStyle: false };

let png: Buffer;

const modelReturning = (calls: { prompt?: string; size?: string; aspectRatio?: string }[]) =>
  new MockImageModelV4({
    doGenerate: async (options) => {
      calls.push(options as never);

      return { images: [new Uint8Array(png)], warnings: [], response: { timestamp: new Date(), modelId: "m", headers: {} } } as never;
    },
  });

beforeEach(async () => {
  vi.clearAllMocks();
  upload.mockResolvedValue({ error: null });
  png = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#884400" } }).png().toBuffer();
});

describe("generateSlideImage", () => {
  it("стиль кампанії додається лише на запит; OpenAI отримує size", async () => {
    const calls: { prompt?: string; size?: string }[] = [];

    generateImageModel.model = modelReturning(calls);

    await generateSlideImage(input);
    await generateSlideImage({ ...input, useCampaignStyle: true });

    expect(JSON.stringify(calls[0].prompt)).not.toContain("Стиль кампанії");
    expect(JSON.stringify(calls[1].prompt)).toContain("Стиль кампанії: Темне фентезі");
    expect(calls[0].size).toBe("1536x1024");
  });

  it("Google отримує aspectRatio", async () => {
    const calls: { aspectRatio?: string; size?: string }[] = [];

    generateImageModel.model = modelReturning(calls);

    await generateSlideImage({ ...input, provider: "google", aspect: "9:16" });

    expect(calls[0].aspectRatio).toBe("9:16");
    expect(calls[0].size).toBeUndefined();
  });

  it("WebP у папці кампанії з річним кешем, повертає публічне посилання, розмір обмежено", async () => {
    generateImageModel.model = modelReturning([]);

    const { url } = await generateSlideImage(input);

    const [path, buffer, options] = upload.mock.calls[0];

    expect(path).toMatch(/^camp1\/[a-f0-9]{32}\.webp$/);
    expect(options).toEqual({ contentType: "image/webp", cacheControl: "31536000" });
    expect(url).toBe(`https://x.supabase.co/storage/v1/object/public/scene-slides/${path}`);

    const meta = await sharp(buffer).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2560);
  });

  it("403 від провайдера — текст про доступ до моделі, без сирого тексту й ключа", async () => {
    generateImageModel.model = new MockImageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: "no access sk-SECRET-key", url: "https://api", requestBodyValues: {}, statusCode: 403, responseBody: "sk-SECRET-key", isRetryable: false });
      },
    });

    const error = await generateSlideImage(input).catch((e) => e);

    expect(error.message).toBe(API_ERRORS.AI_MODEL_FORBIDDEN);
    expect(error.message).not.toContain("SECRET");
  });

  it("фільтр безпеки (400 content_policy і NoImageGeneratedError) — AI_IMAGE_REJECTED", async () => {
    generateImageModel.model = new MockImageModelV4({
      doGenerate: async () => {
        throw new APICallError({ message: "x", url: "https://api", requestBodyValues: {}, statusCode: 400, responseBody: '{"error":{"code":"content_policy_violation"}}', isRetryable: false });
      },
    });

    expect((await generateSlideImage(input).catch((e) => e)).message).toBe(API_ERRORS.AI_IMAGE_REJECTED);

    generateImageModel.model = new MockImageModelV4({
      doGenerate: async () => {
        throw new NoImageGeneratedError({});
      },
    });

    expect((await generateSlideImage(input).catch((e) => e)).message).toBe(API_ERRORS.AI_IMAGE_REJECTED);
    expect(upload).not.toHaveBeenCalled();
  });
});
