import type { AssistantCaller } from "./types";

import { sessionDmActor } from "@/lib/utils/api/actor";

export const chatCaller = (campaignId: string, userId: string, threadId: string | null): AssistantCaller => ({ actor: sessionDmActor(campaignId, userId), channel: "chat", threadId, tokenId: null });
