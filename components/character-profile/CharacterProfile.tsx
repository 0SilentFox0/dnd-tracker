"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { CombatTab } from "./CombatTab";
import { ItemsTab } from "./ItemsTab";
import { LevelUpBadge } from "./LevelUpBadge";
import { MagicTab } from "./MagicTab";
import { ProfileProvider } from "./ProfileContext";
import { CompactHero, ProfileHero } from "./ProfileHero";
import { type ProfileTab, type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { SkillsTab } from "./SkillsTab";
import { StoryTab } from "./StoryTab";

import "@/components/hud/hud.css";
import { LoadingState, QueryState } from "@/components/common/states";
import { HUD_SURFACE } from "@/components/hud";
import { LevelUpOverlay } from "@/components/skill-tree/progression";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

const ProfileEditor = dynamic(() => import("./ProfileEditor").then((m) => m.ProfileEditor), { ssr: false, loading: () => <LoadingState /> });

const VIEW_TABS: ProfileTabId[] = ["combat", "skills", "magic", "items", "story"];

function viewTabs(): ProfileTab[] {
  return [
    { id: "combat", label: "Бій", content: <CombatTab /> },
    { id: "skills", label: "Вміння", content: <SkillsTab /> },
    { id: "magic", label: "Магія", content: <MagicTab /> },
    { id: "items", label: "Речі", content: <ItemsTab /> },
    { id: "story", label: "Історія", content: <StoryTab /> },
  ];
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
  return <div className={cn(HUD_SURFACE, "mx-auto min-h-dvh max-w-3xl bg-[radial-gradient(120%_60%_at_50%_0%,#2a221a,#110e0b_70%)]")}>{children}</div>;
}

const asTab = (v: string | undefined): ProfileTabId => (v && (VIEW_TABS as string[]).includes(v) ? (v as ProfileTabId) : "combat");

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
                  badge={<LevelUpBadge free={sheet.progression.freePoints} onOpen={() => setTab("skills")} />}
                  actions={
                    canEdit && sheet.viewer.isDM ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Редагувати
                      </Button>
                    ) : null
                  }
                />
                <ProfileTabs value={tab} onValueChange={setTab} tabs={viewTabs()} header={hero.past ? <CompactHero /> : null} />
                <LevelUpOverlay campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />
              </>
            )}
          </ProfileShell>
        </ProfileProvider>
      )}
    </QueryState>
  );
}
