"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { BookOpen, ChevronsUpDown, History, Moon, Sun } from "lucide-react";

import { ScenarioAiPanel } from "./scenario-ai-panel";
import { ScenarioPageActions } from "./scenario-page-actions";

import type { ActionsMenuItem } from "@/components/common/ActionsMenu";
import { LoadingState, QueryState } from "@/components/common/states";
import { OnboardingHint } from "@/components/onboarding/OnboardingHint";
import { ScenarioBar, ScenarioBook, ScenarioLayout, ScenarioPageView, ScenarioSummaryPanel, ScenarioToc, type TocControl, tocItems } from "@/components/scenario";
import { VersionsDialog } from "@/components/scenario/editor/VersionsDialog";
import { ScenarioShowDock } from "@/components/scenario/play/ScenarioShowDock";
import type { AiThreadMode } from "@/lib/constants/ai";
import { useAiProposals } from "@/lib/hooks/ai";
import { useMediaQuery } from "@/lib/hooks/common";
import { useGenerateScenarioSummary, useScenarioPage, useScenarioPlay, useSceneNeighbours, useSectionCollapse, useSectionProgress } from "@/lib/hooks/scenario";
import { useAppDark } from "@/lib/hooks/theme";
import { playedLookup } from "@/lib/utils/scenario/reveal";
import { pickLiveSection } from "@/lib/utils/scenario/structure";
import type { AiFocus } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

const ScenarioEditor = dynamic(() => import("@/components/scenario/editor"), { ssr: false, loading: () => <LoadingState /> });

type PlayedPages = { id: string; played: string[] }[];

export function ScenarioPageClient({ campaignId, pageId, playedPages, aiEnabled, canEdit = true, isDemo = false }: { campaignId: string; pageId: string; playedPages: PlayedPages; aiEnabled: boolean; canEdit?: boolean; isDemo?: boolean }) {
  const query = useScenarioPage(campaignId, pageId);

  return <QueryState query={query}>{(page) => <ScenarioPageBody campaignId={campaignId} page={page} playedPages={playedPages} aiEnabled={aiEnabled} canEdit={canEdit} isDemo={isDemo} />}</QueryState>;
}

function SummarySection({ campaignId, pageId }: { campaignId: string; pageId: string }) {
  const t = useTranslations("scenario.summary");

  return (
    <>
      <OnboardingHint id="dm.summaries" className="mb-3 text-left" />
      <details className="mb-4 rounded-lg border bg-card/75 p-3">
        <summary className="cursor-pointer text-sm font-medium">{t("title")}</summary>
        <div className="mt-3">
          <ScenarioSummaryPanel campaignId={campaignId} pageId={pageId} />
        </div>
      </details>
    </>
  );
}

function ScenarioPageBody({ campaignId, page, playedPages, aiEnabled, canEdit, isDemo }: { campaignId: string; page: ScenarioPage; playedPages: PlayedPages; aiEnabled: boolean; canEdit: boolean; isDemo: boolean }) {
  const t = useTranslations("scenario.pageBody");

  const progress = useSectionProgress(campaignId, page.id);

  const summary = useGenerateScenarioSummary(campaignId);

  const collapse = useSectionCollapse();

  const neighbours = useSceneNeighbours(campaignId, page.id);

  const sceneLink = (p?: { id: string; title: string }) => (p ? { href: `/campaigns/${campaignId}/dm/scenario/${p.id}`, title: p.title } : undefined);

  const [hideNotes, setHideNotes] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  const [editBase, setEditBase] = useState<ScenarioPage | null>(null);

  const playEnabled = page.kind === "scene" && !editBase && (canEdit || isDemo);

  const play = useScenarioPlay(campaignId, page.content, playEnabled, { readOnly: !canEdit });

  const [versionsOpen, setVersionsOpen] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);

  const [tocOpen, setTocOpen] = useState(false);

  const wide = useMediaQuery("(min-width: 1200px)");

  const tocInline = wide && !(aiEnabled && aiOpen);

  const toc: TocControl = { inline: tocInline, drawer: { open: tocOpen, onOpenChange: setTocOpen } };

  const played = useMemo(() => playedLookup(playedPages), [playedPages]);

  const appDark = useAppDark();

  const dark = theme ? theme === "dark" : appDark;

  const [pendingShown, setPendingShown] = useState(false);

  const [focusCleared, setFocusCleared] = useState(false);

  const draftRef = useRef<{ flush: () => Promise<boolean>; hasUnsavedChanges?: () => boolean } | null>(null);

  const onDraftReady = useCallback((d: { flush: () => Promise<boolean>; hasUnsavedChanges?: () => boolean }) => {
    draftRef.current = d;
  }, []);

  const proposals = useAiProposals(campaignId, page.id, {
    enabled: aiEnabled,
    full: aiOpen,
    beforeApply: async () => (editBase && draftRef.current ? draftRef.current.flush() : true),
    // remount the editor from the applied page so its draft carries the new version — no 409 on the next autosave
    onApplied: (next) => { if (!draftRef.current?.hasUnsavedChanges?.()) setEditBase((cur) => (cur ? next : cur)); },
  });

  const aiMode: AiThreadMode = playEnabled ? "live" : "scenario";

  const currentSection = playEnabled && !focusCleared ? pickLiveSection(page.content) ?? undefined : undefined;

  const focus: AiFocus | undefined = focusCleared ? undefined : { pageId: page.id, sectionId: currentSection?.id };

  const openAi = (showPending: boolean) => {
    setPendingShown(showPending);
    setAiOpen(true);
  };

  const actions = (
    <ScenarioPageActions
      campaignId={campaignId}
      page={page}
      flags={{ canEdit, aiEnabled, editing: !!editBase }}
      summary={summary}
      proposals={{ pendingCount: proposals.pendingCount }}
      on={{ edit: () => setEditBase(page), openAi }}
    />
  );

  const menu: ActionsMenuItem[] = [
    { label: dark ? t("lightTheme") : t("darkTheme"), icon: dark ? Sun : Moon, onSelect: () => setTheme(dark ? "light" : "dark") },
    ...(editBase || !canEdit ? [] : [{ label: t("versions"), icon: History, onSelect: () => setVersionsOpen(true) }]),
    { label: collapse.showPlayed ? t("collapsePlayed") : t("expandPlayed"), icon: ChevronsUpDown, onSelect: () => collapse.setShowPlayed(!collapse.showPlayed) },
    { label: t("toIndex"), icon: BookOpen, href: `/campaigns/${campaignId}/dm/scenario`, separatorBefore: true },
  ];

  return (
    <ScenarioBook hideNotes={hideNotes && !editBase} theme={theme} withAi={aiEnabled && aiOpen}>
      <ScenarioBar
        title={page.title}
        notes={{ hidden: hideNotes, toggle: () => setHideNotes((v) => !v) }}
        toc={tocInline ? undefined : { onOpen: () => setTocOpen(true) }}
        nav={page.kind === "scene" && !editBase ? { prev: sceneLink(neighbours.prev), next: sceneLink(neighbours.next) } : undefined}
        actions={actions}
        menu={menu}
      />
      {editBase ? (
        <ScenarioEditor key={editBase.version} campaignId={campaignId} page={editBase} onExit={() => setEditBase(null)} onDraftReady={onDraftReady} toc={toc} />
      ) : (
        <ScenarioLayout
          toc={<ScenarioToc items={tocItems(page.content.sections, page.kind === "hero", played)} {...toc} onPick={collapse.expand} />}
        >
          {canEdit && page.kind === "scene" && <SummarySection campaignId={campaignId} pageId={page.id} />}
          <ScenarioPageView
            page={page}
            campaignId={campaignId}
            play={playEnabled ? play : undefined}
            progress={canEdit ? {
              onPlayed: (id, v) => {
                collapse.expand(id);
                void progress.setPlayed(id, v).catch(() => {});
              },
              onRevealed: (id, v) => {
                collapse.expand(id);
                void progress.setRevealed(id, v).catch(() => {});
              },
              pending: progress.isPending,
              played,
            } : undefined}
            collapse={collapse}
          />
          {!canEdit && <aside className="mt-4 rounded-lg border border-hud-gold/40 bg-hud-panel/70 p-3 text-sm text-hud-muted">{t("demoPlaybackReadOnly")}</aside>}
        </ScenarioLayout>
      )}
      {playEnabled && <ScenarioShowDock campaignId={campaignId} pageId={page.id} content={page.content} play={play} />}
      {aiEnabled && aiOpen && (
        <ScenarioAiPanel
          campaignId={campaignId}
          mode={aiMode}
          page={page}
          focus={{ value: focus, onClear: () => setFocusCleared(true) }}
          proposals={{ data: proposals, showPending: pendingShown }}
          onClose={() => setAiOpen(false)}
        />
      )}
      {versionsOpen && !editBase && <VersionsDialog campaignId={campaignId} pageId={page.id} open onOpenChange={setVersionsOpen} onRestored={() => {}} />}
    </ScenarioBook>
  );
}
