"use client";

import { useState } from "react";
import Link from "next/link";

import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { useScenarioPage, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

export function ScenarioPageClient({ campaignId, initialPage }: { campaignId: string; initialPage: ScenarioPage }) {
  const { data: page = initialPage } = useScenarioPage(campaignId, initialPage.id, initialPage);

  const progress = useSectionProgress(campaignId, page.id);

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  return (
    <ScenarioBook hideNotes={hideNotes} theme={theme}>
      <ScenarioBar
        title={page.title}
        sections={page.content.sections}
        hideNotes={hideNotes}
        onToggleNotes={() => setHideNotes((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        actions={
          <Link className="toggle" href={`/campaigns/${campaignId}/dm/scenario`}>
            До змісту
          </Link>
        }
      />
      <ScenarioPageView
        page={page}
        campaignId={campaignId}
        progress={{ onPlayed: (id, v) => void progress.setPlayed(id, v).catch(() => {}), onRevealed: (id, v) => void progress.setRevealed(id, v).catch(() => {}), pending: progress.isPending }}
      />
    </ScenarioBook>
  );
}
