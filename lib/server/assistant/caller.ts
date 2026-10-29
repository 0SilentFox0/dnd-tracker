import type { AssistantCaller } from "./types";

import type { Locale } from "@/lib/i18n/config";
import { sessionDmActor } from "@/lib/utils/api/actor";

export const chatCaller = (campaignId: string, userId: string, threadId: string | null, locale: Locale): AssistantCaller => ({ actor: sessionDmActor(campaignId, userId), channel: "chat", threadId, tokenId: null, locale });
