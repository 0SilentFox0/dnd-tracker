import { campaignPost } from "@/lib/api/client";
import type { CorruptionGrantBody, CorruptionGrantResult, CorruptionUndoBody, CorruptionUndoResult } from "@/types/corruption";

export const postCorruptionGrant = (campaignId: string, characterId: string, body: CorruptionGrantBody) => campaignPost<CorruptionGrantResult>(campaignId, `/characters/${characterId}/corruption`, body);

export const postCorruptionUndo = (campaignId: string, characterId: string, body: CorruptionUndoBody) => campaignPost<CorruptionUndoResult>(campaignId, `/characters/${characterId}/corruption/undo`, body);
