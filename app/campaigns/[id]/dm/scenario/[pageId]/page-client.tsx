"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { LoadingState } from "@/components/common/states";
import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { VersionsDialog } from "@/components/scenario/editor/VersionsDialog";
import { useScenarioPage, useSectionProgress } from "@/lib/hooks/scenario";
import type { ScenarioPage } from "@/types/scenario";

const ScenarioEditor = dynamic(() => import("@/components/scenario/editor"), { ssr: false, loading: () => <LoadingState /> });

export function ScenarioPageClient({ campaignId, initialPage }: { campaignId: string; initialPage: ScenarioPage }) {
  const { data: page = initialPage } = useScenarioPage(campaignId, initialPage.id, initialPage);

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
          progress={{ onPlayed: (id, v) => void progress.setPlayed(id, v).catch(() => {}), onRevealed: (id, v) => void progress.setRevealed(id, v).catch(() => {}), pending: progress.isPending }}
        />
      )}
      {versionsOpen && !editBase && <VersionsDialog campaignId={campaignId} pageId={page.id} open onOpenChange={setVersionsOpen} onRestored={() => {}} />}
    </ScenarioBook>
  );
}
