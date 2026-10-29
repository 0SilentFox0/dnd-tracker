"use client";

import { useCallback } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";

import { battleKeys } from "@/lib/hooks/battles/keys";
import { invalidateCampaignQueries } from "@/lib/hooks/campaigns/invalidate";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { trackKeys } from "@/lib/hooks/music/keys";
import { scenarioKeys } from "@/lib/hooks/scenario/keys";
import { showKeys } from "@/lib/hooks/show/keys";
import { skillKeys } from "@/lib/hooks/skills/keys";
import { spellKeys } from "@/lib/hooks/spells/keys";
import { unitKeys } from "@/lib/hooks/units/keys";
import type { ReceiptDto } from "@/types/assistant";

type EditorTarget = { campaignId: string; domain: string; id: string };
type Flush = () => Promise<boolean>;

const BATTLE_ROOTS = (campaignId: string) => [["battle", campaignId], battleKeys.list(campaignId), ["battle-summary", campaignId], battleKeys.briefs(campaignId), battleKeys.balance(campaignId), ["battle-audio", campaignId]] as const;

const DOMAIN_KEYS: Record<string, (campaignId: string) => readonly (readonly unknown[])[]> = {
  scenario: (c) => [scenarioKeys.list(c), ["scenario-page", c], ["scenario-versions", c], ["scenario-mentions", c], ["scenario-search", c]],
  show: (c) => [showKeys.decks(c), ["show-deck", c], showKeys.state(c), showKeys.audio(c)],
  battles: BATTLE_ROOTS,
  "battle-participants": BATTLE_ROOTS,
  characters: (c) => [characterKeys.lists(c), characterKeys.details(c), characterKeys.roster(c), characterKeys.stashes(c), characterKeys.freeArtifacts(c), characterKeys.sheet(c), skillKeys.progressionOf(c), battleKeys.balance(c)],
  spells: (c) => [spellKeys.list(c), ["spell", c], spellKeys.groups(c)],
  units: (c) => [unitKeys.list(c), ["unit", c], battleKeys.balance(c)],
  skills: (c) => [skillKeys.list(c), ["skill", c], skillKeys.mainSkills(c), skillKeys.trees(c), skillKeys.progressionOf(c)],
  tracks: (c) => [trackKeys.list(c)],
};

async function invalidateAffected(client: QueryClient, campaignId: string, domains: string[]) {
  if (domains.some(d => !DOMAIN_KEYS[d])) return invalidateCampaignQueries(client, campaignId);

  const prefixes = domains.flatMap(domain => DOMAIN_KEYS[domain](campaignId));

  await client.invalidateQueries({ predicate: q => prefixes.some(prefix => prefix.every((part, i) => q.queryKey[i] === part)), refetchType: "active" });
}

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

    if (!saved) throw new Error("Failed to save the open editor. The changes were not applied.");
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
      await invalidateAffected(client, campaignId, [...new Set(refs.map(r => r.domain))]);

      if (refs.some(r => ["battles", "show", "campaign"].includes(r.domain))) await client.invalidateQueries({ queryKey: battleKeys.active() });
    } catch { receipts.delete(receipt.id); throw new Error("Failed to refresh the data after the receipt."); }
  }, [campaignId, client]);

  return { consumeReceipt };
}
