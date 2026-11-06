"use client";

import { useState } from "react";

import type { ScenarioEditSession } from "./useScenarioEditSession";

import type { AiThreadMode } from "@/lib/constants/ai";
import { useAiProposals } from "@/lib/hooks/ai";
import { pickLiveSection } from "@/lib/utils/scenario/structure";
import type { AiFocus } from "@/types/ai";
import type { ScenarioPage } from "@/types/scenario";

export function useScenarioPageAi(campaignId: string, page: ScenarioPage, opts: { enabled: boolean; playing: boolean; edit: ScenarioEditSession }) {
  const { enabled, playing, edit } = opts;

  const [open, setOpen] = useState(false);

  const [pendingShown, setPendingShown] = useState(false);

  const [focusCleared, setFocusCleared] = useState(false);

  const proposals = useAiProposals(campaignId, page.id, {
    enabled,
    full: open,
    beforeApply: async () => (edit.base ? edit.flush() : true),
    onApplied: edit.rebase,
  });

  const mode: AiThreadMode = playing ? "live" : "scenario";

  const section = playing && !focusCleared ? pickLiveSection(page.content) ?? undefined : undefined;

  const focus: AiFocus | undefined = focusCleared ? undefined : { pageId: page.id, sectionId: section?.id };

  return {
    isOpen: enabled && open,
    mode,
    focus,
    proposals,
    pendingShown,
    openPanel: (showPending: boolean) => {
      setPendingShown(showPending);
      setOpen(true);
    },
    close: () => setOpen(false),
    clearFocus: () => setFocusCleared(true),
  };
}
