import { SYNC_DEFAULT_ON, SYNC_TABLE_SCOPES } from "@/lib/constants/source-sync";
import type { Translator } from "@/lib/i18n/translator";
import type { SourceDiffItem, SourceSyncScope, SyncRef } from "@/types/campaigns";

export const itemKey = (i: { scope: string; key: string }) => `${i.scope}:${i.key}`;

export const defaultSelection = (items: SourceDiffItem[]) => new Set(items.filter((i) => SYNC_DEFAULT_ON.has(i.status)).map(itemKey));

const SCOPE_ORDER: readonly SourceSyncScope[] = ["rules", "settings", ...SYNC_TABLE_SCOPES];

export function groupItems(items: SourceDiffItem[]) {
  return SCOPE_ORDER.map((scope) => ({ scope, items: items.filter((i) => i.scope === scope) })).filter((g) => g.items.length > 0);
}

export function autoAddedPreview(items: SourceDiffItem[], selected: ReadonlySet<string>) {
  const byKey = new Map(items.map((i) => [itemKey(i), i]));

  const out = new Map<string, SourceDiffItem["requires"][number]>();

  const queue = items.filter((i) => selected.has(itemKey(i)));

  for (let head = 0; head < queue.length; head++) {
    for (const r of queue[head].requires) {
      const k = itemKey(r);

      if (selected.has(k) || out.has(k)) continue;

      out.set(k, r);

      const pulled = byKey.get(k);

      if (pulled) queue.push(pulled);
    }
  }

  return [...out.values()];
}

export function usageTotals(items: SourceDiffItem[]) {
  return items.reduce((t, i) => ({ characters: t.characters + (i.usage?.characters ?? 0), content: t.content + (i.usage?.content ?? 0) }), { characters: 0, content: 0 });
}

export const toRefs = (items: SourceDiffItem[], selected: ReadonlySet<string>): SyncRef[] =>
  items.filter((i) => selected.has(itemKey(i))).map(({ scope, key, sourceHash, status }) => ({ scope, key, sourceHash, status }));

export function formatUsage(usage: { characters: number; content: number }, t: Translator): string | null {
  const parts = [
    usage.characters > 0 && t("sourceSync.usage.characters", { count: usage.characters }),
    usage.content > 0 && t("sourceSync.usage.records", { count: usage.content }),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}
