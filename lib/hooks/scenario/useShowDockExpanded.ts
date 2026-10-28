"use client";

import { createStorageFlag, useStorageValue } from "@/lib/hooks/common/storage-value";

const dockExpanded = createStorageFlag("scenario-show-dock", false);

export function useShowDockExpanded(): [boolean, (value: boolean) => void] {
  return [useStorageValue(dockExpanded, false), dockExpanded.set];
}
