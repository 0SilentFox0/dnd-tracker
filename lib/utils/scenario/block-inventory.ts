import { pluralUk } from "@/lib/utils/common/plural";
import type { RichDoc, RichNode } from "@/types/scenario";

export type BlockKind = "callout" | "readAloud" | "say" | "table" | "token" | "mention" | "secret";

export type BlockInventory = Record<BlockKind, number>;

const NODE_KINDS = ["callout", "readAloud", "say", "table", "token", "mention"] as const;

const LABELS: Record<BlockKind, [string, string, string]> = {
  callout: ["виноску", "виноски", "виносок"],
  readAloud: ["блок «читати вголос»", "блоки «читати вголос»", "блоків «читати вголос»"],
  say: ["репліку", "репліки", "реплік"],
  table: ["таблицю", "таблиці", "таблиць"],
  token: ["токен", "токени", "токенів"],
  mention: ["згадку", "згадки", "згадок"],
  secret: ["секрет", "секрети", "секретів"],
};

const empty = (): BlockInventory => ({ callout: 0, readAloud: 0, say: 0, table: 0, token: 0, mention: 0, secret: 0 });

function walk(nodes: RichNode[] | undefined, inv: BlockInventory) {
  for (const n of nodes ?? []) {
    if ((NODE_KINDS as readonly string[]).includes(n.type)) inv[n.type as (typeof NODE_KINDS)[number]] += 1;

    if (n.marks?.some((m) => m.type === "secret")) inv.secret += 1;

    walk(n.content, inv);
  }
}

export function blockInventory(doc: RichDoc): BlockInventory {
  const inv = empty();

  walk(doc.content, inv);
  inv.secret = Math.min(inv.secret, 1);

  return inv;
}

export function lostBlocks(before: RichDoc, after: RichDoc): Partial<Record<BlockKind, number>> {
  const a = blockInventory(before);

  const b = blockInventory(after);

  const lost: Partial<Record<BlockKind, number>> = {};

  for (const k of Object.keys(a) as BlockKind[]) if (b[k] < a[k]) lost[k] = a[k] - b[k];

  return lost;
}

export function describeLost(lost: Partial<Record<BlockKind, number>>): string {
  return (Object.keys(lost) as BlockKind[]).map((k) => `${lost[k]} ${pluralUk(lost[k] as number, LABELS[k])}`).join(", ");
}
