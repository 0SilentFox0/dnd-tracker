"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { AiPanel, AiProposalBadge, AiProposalCard } from "@/components/ai";
import { LoadingState, QueryState } from "@/components/common/states";
import { ScenarioBar, ScenarioBook, ScenarioPageView } from "@/components/scenario";
import { VersionsDialog } from "@/components/scenario/editor/VersionsDialog";
import { ScenarioShowDock } from "@/components/scenario/play/ScenarioShowDock";
import type { AiThreadMode } from "@/lib/constants/ai";
import { useAiProposals } from "@/lib/hooks/ai";
import { useScenarioPage, useScenarioPlay, useSectionCollapse, useSectionProgress } from "@/lib/hooks/scenario";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import { pickLiveSection } from "@/lib/utils/scenario/structure";
import type { AiFocus } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const ScenarioEditor = dynamic(() => import("@/components/scenario/editor"), { ssr: false, loading: () => <LoadingState /> });

type PlayedPages = { id: string; played: string[] }[];

export function ScenarioPageClient({ campaignId, pageId, playedPages, aiEnabled }: { campaignId: string; pageId: string; playedPages: PlayedPages; aiEnabled: boolean }) {
  const query = useScenarioPage(campaignId, pageId);

  return <QueryState query={query}>{(page) => <ScenarioPageBody campaignId={campaignId} page={page} playedPages={playedPages} aiEnabled={aiEnabled} />}</QueryState>;
}

function ScenarioPageBody({ campaignId, page, playedPages, aiEnabled }: { campaignId: string; page: ScenarioPage; playedPages: PlayedPages; aiEnabled: boolean }) {
  const progress = useSectionProgress(campaignId, page.id);

  const collapse = useSectionCollapse();

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  const [editBase, setEditBase] = useState<ScenarioPage | null>(null);

  const playEnabled = page.kind === "scene" && !editBase;

  const play = useScenarioPlay(campaignId, page.content, playEnabled);

  const [versionsOpen, setVersionsOpen] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);

  const [pendingShown, setPendingShown] = useState(false);

  const [focusCleared, setFocusCleared] = useState(false);

  const draftRef = useRef<{ flush: () => Promise<boolean> } | null>(null);

  const onDraftReady = useCallback((d: { flush: () => Promise<boolean> }) => {
    draftRef.current = d;
  }, []);

  const proposals = useAiProposals(campaignId, page.id, {
    enabled: aiEnabled,
    full: aiOpen,
    beforeApply: async () => (editBase && draftRef.current ? draftRef.current.flush() : true),
    // remount the editor from the applied page so its draft carries the new version — no 409 on the next autosave
    onApplied: (next) => setEditBase((cur) => (cur ? next : cur)),
  });

  const aiMode: AiThreadMode = playEnabled ? "live" : "scenario";

  const currentSection = playEnabled && !focusCleared ? pickLiveSection(page.content) ?? undefined : undefined;

  const focus: AiFocus = { pageId: page.id, sectionId: currentSection?.id };

  const openAi = (showPending: boolean) => {
    setPendingShown(showPending);
    setAiOpen(true);
  };

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
          <Link className="toggle" href={`/campaigns/${campaignId}/show`} target="_blank" rel="noopener">
            Екран показу ↗
          </Link>
        </>
      )}
      {aiEnabled && (
        <>
          <button type="button" className="toggle" onClick={() => openAi(false)}>
            AI
          </button>
          <AiProposalBadge count={proposals.pendingCount} onClick={() => openAi(true)} />
        </>
      )}
      <Link className="toggle" href={`/campaigns/${campaignId}/dm/scenario`}>
        До змісту
      </Link>
    </>
  );

  return (
    <ScenarioBook hideNotes={hideNotes && !editBase} theme={theme} withAi={aiEnabled && aiOpen}>
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
        <ScenarioEditor key={editBase.version} campaignId={campaignId} page={editBase} onExit={() => setEditBase(null)} onDraftReady={onDraftReady} />
      ) : (
        <ScenarioPageView
          page={page}
          campaignId={campaignId}
          play={playEnabled ? play : undefined}
          progress={{
            onPlayed: (id, v) => {
              collapse.expand(id);
              void progress.setPlayed(id, v).catch(() => {});
            },
            onRevealed: (id, v) => {
              collapse.expand(id);
              void progress.setRevealed(id, v).catch(() => {});
            },
            pending: progress.isPending,
            played: playedLookup(playedPages),
          }}
          collapse={collapse}
        />
      )}
      {playEnabled && <ScenarioShowDock campaignId={campaignId} pageId={page.id} content={page.content} play={play} />}
      {aiEnabled && aiOpen && (
        <AiPanel
          campaignId={campaignId}
          page={page}
          mode={aiMode}
          focus={focus}
          proposals={proposals}
          showPending={pendingShown}
          renderProposal={(id, { send }) => {
            const proposal = proposals.byId(id);

            if (!proposal) return null;

            const onRedo = () => send?.(`Пропозиція «${proposal.summary}» застаріла: перечитай сторінку й запропонуй її заново.`);

            return <AiProposalCard campaignId={campaignId} proposal={proposal} busy={proposals.isApplying} actions={{ onApply: () => proposals.apply(id), onReject: () => proposals.reject(id), onRedo }} />;
          }}
          actions={{ onClose: () => setAiOpen(false), onClearFocus: () => setFocusCleared(true) }}
        />
      )}
      {versionsOpen && !editBase && <VersionsDialog campaignId={campaignId} pageId={page.id} open onOpenChange={setVersionsOpen} onRestored={() => {}} />}
    </ScenarioBook>
  );
}
