import type { SyncItem } from "@/lib/server/templates/sync/types";

export const id = (ch: string) => "c" + ch.repeat(24);

export const visible = (items: SyncItem[]) => items.filter((i) => i.visible && !i.ignored);
