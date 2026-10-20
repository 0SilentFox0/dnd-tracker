"use client";

import { useState } from "react";
import Link from "next/link";

import { useScenarioSearch } from "@/lib/hooks/scenario";

export function ScenarioSearch({ campaignId }: { campaignId: string }) {
  const [query, setQuery] = useState("");

  const { hits, isFetching } = useScenarioSearch(campaignId, query);

  return (
    <div>
      <input type="search" aria-label="Пошук по сценарію" placeholder="Пошук по сценарію…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          {!isFetching && hits.length === 0 && <li>Нічого не знайдено</li>}
        </ul>
      )}
    </div>
  );
}
