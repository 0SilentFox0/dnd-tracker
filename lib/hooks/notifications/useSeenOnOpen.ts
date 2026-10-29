"use client";

import { useEffect, useRef, useState } from "react";

import { useMarkRead } from "./useMarkRead";
import { useNotifications } from "./useNotifications";

import { unreadOfTypes } from "@/lib/utils/notifications/select";
import type { NotificationType } from "@/types/notifications";

const NONE: ReadonlySet<string> = new Set();

export function useSeenOnOpen(
  campaignId: string,
  { types, enabled = true }: { types: readonly NotificationType[]; enabled?: boolean },
): ReadonlySet<string> {
  const { data } = useNotifications(campaignId, { enabled });

  const { markRead } = useMarkRead(campaignId);

  const [seen, setSeen] = useState<ReadonlySet<string>>(NONE);

  const handled = useRef<unknown>(null);

  const typesKey = types.join(",");

  useEffect(() => {
    if (!enabled || !data || handled.current === data) return;

    handled.current = data;

    const unread = unreadOfTypes(data, types);

    if (!unread.length) return;

    setSeen((prev) => new Set([...prev, ...unread.map((n) => n.refId)]));
    void markRead({ types: [...types] });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- types are keyed by typesKey
  }, [enabled, data, typesKey]);

  return seen;
}
