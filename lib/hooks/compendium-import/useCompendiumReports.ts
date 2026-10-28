"use client";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { compendiumKeys } from "./keys";

import { getCompendiumReports } from "@/lib/api/compendium";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { offsetPager } from "@/lib/hooks/common";

export function useCompendiumReports(campaignId: string) {
  const [offset, setOffset] = useState(0);

  const query = useQuery({ queryKey: compendiumKeys.reports(campaignId, offset), queryFn: ({ signal }) => getCompendiumReports(campaignId, offset, signal), placeholderData: keepPreviousData });

  return { runs: query.data?.runs ?? [], isError: query.isError, pager: offsetPager(offset, COMPENDIUM_PAGE_SIZES.runs, query.data?.hasMore ?? false, setOffset) };
}
