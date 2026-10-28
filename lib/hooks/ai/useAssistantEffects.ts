"use client";

import { useCallback } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

import { battleKeys } from "@/lib/hooks/battles/keys";
import { invalidateCampaignQueries } from "@/lib/hooks/campaigns/invalidate";
import type { ReceiptDto } from "@/types/assistant";

type EditorTarget = { campaignId: string; domain: string; id: string };
type Flush = () => Promise<boolean>;

const editors = new Map<EditorTarget, Flush>();

const seen = new WeakMap<QueryClient, Map<string, Set<string>>>();

/** Registration is local to the mounted editor, never persisted in browser storage. */
export function registerAssistantBeforeApply(target: EditorTarget, flush: Flush): () => void {
  const key = { ...target };

  editors.set(key, flush);

  return () => { editors.delete(key); };
}

export async function flushAssistantBeforeApply(campaignId: string): Promise<void> {
  // Every open campaign editor must be saved, including a command whose cascade
  // reaches it indirectly. The server remains responsible for the actual targets.
  for (const [target, flush] of editors) {
    if (target.campaignId !== campaignId) continue;

    let saved = false;

    try { saved = await flush(); } catch { /* Fail closed; never expose editor internals. */ }

    if (!saved) throw new Error("Не вдалося зберегти відкритий редактор. Зміни не застосовано.");
  }
}

export function useAssistantEffects(campaignId: string) {
  const client = useQueryClient();

  const consumeReceipt = useCallback(async (receipt: ReceiptDto) => {
    if (receipt.status !== "applied" || !receipt.result || !Array.isArray(receipt.result.affected)) return;

    const refs = receipt.result.affected;

    if (typeof receipt.id !== "string" || !receipt.id || receipt.id.length > 300 || !refs.length || refs.length > 2000 || refs.some(r => !r || typeof r !== "object" || typeof r.domain !== "string" || !r.domain || r.domain.length > 80 || typeof r.id !== "string" || !r.id || r.id.length > 100)) return;

    let campaigns = seen.get(client);

    if (!campaigns) { campaigns = new Map(); seen.set(client, campaigns); }

    let receipts = campaigns.get(campaignId);

    if (!receipts) { receipts = new Set(); campaigns.set(campaignId, receipts); }

    if (receipts.has(receipt.id)) return;

    receipts.add(receipt.id);
    try {
      // Reuse the current campaign invalidation contract. No parallel domain
      // registry: existing keys include all content, scenario, hero and show data.
      await invalidateCampaignQueries(client, campaignId);

      if (refs.some(r => ["battles", "show", "campaign"].includes(r.domain))) await client.invalidateQueries({ queryKey: battleKeys.active() });
    } catch { receipts.delete(receipt.id); throw new Error("Не вдалося оновити дані. Відновіть стан."); }
  }, [campaignId, client]);

  return { consumeReceipt };
}
