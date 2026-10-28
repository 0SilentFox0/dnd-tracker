"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { InventoryTab } from "./inventory/InventoryTab";
import { CharacterLogTab } from "./rest/CharacterLogTab";
import { DmRestActions } from "./rest/DmRestActions";
import { CombatTab } from "./CombatTab";
import { LevelUpBadge } from "./LevelUpBadge";
import { MagicTab } from "./MagicTab";
import { PendingChoicesBadge } from "./PendingChoicesBadge";
import { ProfileProvider } from "./ProfileContext";
import { CompactHero, ProfileHero } from "./ProfileHero";
import { type ProfileTab, type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { SkillsTab } from "./SkillsTab";
import { StoryTab } from "./StoryTab";

import "@/components/hud/hud.css";
import { DraftBanner } from "@/components/characters/player-draft/DraftBanner";
import { ReviewActions } from "@/components/characters/review/ReviewActions";
import { LoadingState, QueryState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { PlayerSheetHint } from "@/components/onboarding/OnboardingHint";
import { LevelUpOverlay } from "@/components/skill-tree/progression";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

const ProfileEditor = dynamic(() => import("./ProfileEditor").then((m) => m.ProfileEditor), { ssr: false, loading: () => <LoadingState /> });

const VIEW_TABS: ProfileTabId[] = ["combat", "skills", "magic", "items", "story", "log"];

function viewTabs(withLog: boolean): ProfileTab[] {
  const tabs: ProfileTab[] = [
    { id: "combat", label: "Бій", content: <CombatTab /> },
    { id: "skills", label: "Вміння", content: <SkillsTab /> },
    { id: "magic", label: "Магія", content: <MagicTab /> },
    { id: "items", label: "Інвентар", content: <InventoryTab /> },
    { id: "story", label: "Історія", content: <StoryTab /> },
  ];

  return withLog ? [...tabs, { id: "log", label: "Журнал", content: <CharacterLogTab /> }] : tabs;
}

function useScrolledPast() {
  const ref = useRef<HTMLElement>(null);

  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(([e]) => setPast(!e.isIntersecting));

    io.observe(el);

    return () => io.disconnect();
  }, []);

  return { ref, past };
}

export function ProfileShell({ children }: { children: ReactNode }) {
  return <div className={cn(HUD_SURFACE, "mx-auto min-h-dvh max-w-3xl pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] lg:max-w-5xl bg-[radial-gradient(120%_60%_at_50%_0%,#2a221a,#110e0b_70%)]")}>{children}</div>;
}

const asTab = (v: string | undefined): ProfileTabId => {
  const id = v === "stash" ? "items" : v;

  return id && (VIEW_TABS as string[]).includes(id) ? (id as ProfileTabId) : "combat";
};

export function CharacterProfile({ campaignId, characterId, canEdit, initialTab }: { campaignId: string; characterId: string; canEdit: boolean; initialTab?: string }) {
  const query = useCharacterSheet(campaignId, characterId);

  const [tab, setTabState] = useState<ProfileTabId>(() => asTab(initialTab));

  const setTab = (id: ProfileTabId) => {
    setTabState(id);

    const next = new URLSearchParams(window.location.search);

    next.set("tab", id);
    // shallow URL update: no useSearchParams (it forces a client-only Suspense boundary) and no server round trip
    window.history.replaceState(null, "", `${window.location.pathname}?${next.toString()}`);
  };

  const hero = useScrolledPast();

  const [editing, setEditing] = useState(false);

  return (
    <QueryState query={query}>
      {(sheet) => (
        <ProfileProvider campaignId={campaignId} characterId={characterId} sheet={sheet} canEdit={canEdit && sheet.viewer.isDM}>
          <ProfileShell>
            {editing ? (
              <ProfileEditor onDone={() => setEditing(false)} />
            ) : (
              <>
                <ProfileHero
                  ref={hero.ref}
                  badge={
                    <>
                      <LevelUpBadge free={sheet.progression.freePoints} onOpen={() => setTab("skills")} />
                      <PendingChoicesBadge />
                    </>
                  }
                  actions={
                    canEdit && sheet.viewer.isDM ? (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                          Редагувати
                        </Button>
                        <DmRestActions />
                      </>
                    ) : null
                  }
                />
                {sheet.viewer.isOwner && !sheet.viewer.isDM && !sheet.review.pending && <PlayerSheetHint className="mx-3 my-2" />}
                {sheet.review.pending && <DraftBanner campaignId={campaignId} note={sheet.review.note} isOwner={sheet.viewer.isOwner} />}
                {sheet.review.pending && sheet.viewer.isDM && canEdit && <ReviewActions campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />}
                <ProfileTabs value={tab === "log" && !sheet.rest ? "combat" : tab} onValueChange={setTab} tabs={viewTabs(!!sheet.rest)} header={hero.past ? <CompactHero /> : null} />
                <LevelUpOverlay campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />
              </>
            )}
          </ProfileShell>
        </ProfileProvider>
      )}
    </QueryState>
  );
}
