"use client";

import { useCallback, useState } from "react";

import { createStorageFlag, useStorageValue } from "@/lib/hooks/common/storage-value";

const showPlayedFlag = createStorageFlag("scenario-show-played", false);

export interface SectionCollapse {
  showPlayed: boolean;
  setShowPlayed: (value: boolean) => void;
  isExpanded: (id: string) => boolean;
  expand: (id: string) => void;
}

/** Розгорнуті вручну розділи живуть до перезавантаження; перемикач «зіграні розгорнуті» — у браузері. */
export function useSectionCollapse(): SectionCollapse {
  const showPlayed = useStorageValue(showPlayedFlag, false);

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  const expand = useCallback((id: string) => setExpanded((cur) => (cur.has(id) ? cur : new Set(cur).add(id))), []);

  const isExpanded = useCallback((id: string) => showPlayed || expanded.has(id), [showPlayed, expanded]);

  return { showPlayed, setShowPlayed: showPlayedFlag.set, isExpanded, expand };
}
