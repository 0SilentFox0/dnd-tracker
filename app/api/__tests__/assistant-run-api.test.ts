import { API_ERRORS } from "@/lib/constants/api-errors";
import { describe, expect, it, vi } from "vitest";

import { DELETE,GET } from "@/app/api/campaigns/[id]/ai/threads/[threadId]/chat/route";
import { loadMessages } from "@/lib/ai/threads";
import { cancelAssistantRun,readAssistantRuns } from "@/lib/server/assistant/runs";
import { ContentError } from "@/lib/server/content/errors";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(async () => ({ userId: "dm" })) }));
vi.mock("@/lib/server/assistant/runs", () => ({ readAssistantRuns: vi.fn(async () => ({ runs: [], intents: [], receipts: [] })), cancelAssistantRun: vi.fn(async () => ({ runs: [], receipts: [] })) }));
vi.mock("@/lib/ai/threads", () => ({ loadMessages: vi.fn(async () => []) }));

const params = Promise.resolve({ id: "campaign", threadId: "thread" });

describe("assistant chat recovery API", () => {
  it("recovery uses a real session caller and never accepts model run identity", async () => {
    const res = await GET(new Request("http://local/chat"), { params });

    expect(res.status).toBe(200);
    expect(readAssistantRuns).toHaveBeenCalledWith({ actor: { campaignId: "campaign", userId: "dm", via: "session", scopes: null, isDM: true }, threadId: "thread", tokenId: null, channel: "chat" });
  });
  it("statusOnly=1 skips messages, the plain request keeps them", async () => {
    vi.mocked(loadMessages).mockClear();

    expect(Object.keys(await (await GET(new Request("http://local/chat?statusOnly=1"), { params })).json())).not.toContain("messages");
    expect(loadMessages).not.toHaveBeenCalled();
    expect(await (await GET(new Request("http://local/chat"), { params })).json()).toHaveProperty("messages");
  });
  it("foreign thread recovery preserves safe 404 instead of becoming 500", async () => {
    vi.mocked(readAssistantRuns).mockRejectedValueOnce(new ContentError(API_ERRORS.AI_THREAD_NOT_FOUND, 404));

    const res = await GET(new Request("http://local/chat"), { params });

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: API_ERRORS.AI_THREAD_NOT_FOUND });
  });
  it("cancellation forwards only the validated requestId and preserves authorization errors", async () => {
    vi.mocked(cancelAssistantRun).mockRejectedValueOnce(new ContentError(API_ERRORS.ASSISTANT_ACTION_FORBIDDEN, 403));

    const res = await DELETE(new Request("http://local/chat?requestId=stable"), { params });

    expect(res.status).toBe(403);
    expect(cancelAssistantRun).toHaveBeenLastCalledWith(expect.objectContaining({ tokenId: null }), "stable");
    expect((await DELETE(new Request("http://local/chat?requestId=bad%20id"), { params })).status).toBe(400);
  });
});
