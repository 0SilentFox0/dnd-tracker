"use client";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { compendiumKeys } from "./keys";

import { getCompendiumEntries } from "@/lib/api/compendium";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { offsetPager } from "@/lib/hooks/common";

export function useSourceNotes(campaignId: string, kind: string, targetId: string) {
  const [offset, setOffset] = useState(0);

  const query = useQuery({ queryKey: compendiumKeys.entries(campaignId, offset, kind, targetId), queryFn: ({ signal }) => getCompendiumEntries(campaignId, { kind, targetId, offset }, signal), placeholderData: keepPreviousData });

  return { entries: query.data?.entries ?? [], isError: query.isError, pager: offsetPager(offset, COMPENDIUM_PAGE_SIZES.notes, query.data?.hasMore ?? false, setOffset) };
}
