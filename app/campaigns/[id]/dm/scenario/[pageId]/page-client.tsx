"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { LoadingState, QueryState } from "@/components/common/states";
import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { VersionsDialog } from "@/components/scenario/editor/VersionsDialog";
import { useScenarioPage, useSectionProgress } from "@/lib/hooks/scenario";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import type { ScenarioPage } from "@/types/scenario";

const ScenarioEditor = dynamic(() => import("@/components/scenario/editor"), { ssr: false, loading: () => <LoadingState /> });

type PlayedPages = { id: string; played: string[] }[];

export function ScenarioPageClient({ campaignId, pageId, playedPages }: { campaignId: string; pageId: string; playedPages: PlayedPages }) {
  const query = useScenarioPage(campaignId, pageId);

  return <QueryState query={query}>{(page) => <ScenarioPageBody campaignId={campaignId} page={page} playedPages={playedPages} />}</QueryState>;
}

function ScenarioPageBody({ campaignId, page, playedPages }: { campaignId: string; page: ScenarioPage; playedPages: PlayedPages }) {
  const progress = useSectionProgress(campaignId, page.id);

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  const [editBase, setEditBase] = useState<ScenarioPage | null>(null);

  const [versionsOpen, setVersionsOpen] = useState(false);

  // edit mode leaves through the editor's own «Готово», which awaits the last save first
  const actions = (
    <>
      {!editBase && (
        <>
          <button type="button" className="toggle" onClick={() => setEditBase(page)}>
            Редагувати
          </button>
          <button type="button" className="toggle" onClick={() => setVersionsOpen(true)}>
            Версії
          </button>
        </>
      )}
      <Link className="toggle" href={`/campaigns/${campaignId}/dm/scenario`}>
        До змісту
      </Link>
    </>
  );

  return (
    <ScenarioBook hideNotes={hideNotes && !editBase} theme={theme}>
      <ScenarioBar
        title={page.title}
        sections={page.content.sections}
        hideNotes={hideNotes}
        onToggleNotes={() => setHideNotes((v) => !v)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        actions={actions}
      />
      {editBase ? (
        <ScenarioEditor campaignId={campaignId} page={editBase} onExit={() => setEditBase(null)} />
      ) : (
        <ScenarioPageView
          page={page}
          campaignId={campaignId}
          progress={{ onPlayed: (id, v) => void progress.setPlayed(id, v).catch(() => {}), onRevealed: (id, v) => void progress.setRevealed(id, v).catch(() => {}), pending: progress.isPending, played: playedLookup(playedPages) }}
        />
      )}
      {versionsOpen && !editBase && <VersionsDialog campaignId={campaignId} pageId={page.id} open onOpenChange={setVersionsOpen} onRestored={() => {}} />}
    </ScenarioBook>
  );
}
