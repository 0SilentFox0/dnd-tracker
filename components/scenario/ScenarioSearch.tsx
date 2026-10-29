"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useScenarioSearch } from "@/lib/hooks/scenario";

export function ScenarioSearch({ campaignId }: { campaignId: string }) {
  const t = useTranslations("scenario.search");

  const [query, setQuery] = useState("");

  const { hits, isFetching } = useScenarioSearch(campaignId, query);

  return (
    <div>
      <input type="search" aria-label={t("label")} placeholder={t("placeholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
      {query.trim().length >= 2 && (
        <ul className="sb-hits">
          {hits.map((h) => (
            <li key={`${h.pageId}-${h.sectionId}`}>
              <Link href={`/campaigns/${campaignId}/dm/scenario/${h.pageId}${h.sectionId ? `#sec-${h.sectionId}` : ""}`}>
                {h.pageTitle}
                <small>{h.snippet}</small>
              </Link>
            </li>
          ))}
          {!isFetching && hits.length === 0 && <li>{t("empty")}</li>}
        </ul>
      )}
    </div>
  );
}
