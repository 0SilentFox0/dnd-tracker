"use client";

import { type ComponentType, type ReactNode, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

import { InventoryTab } from "./inventory/InventoryTab";
import { CharacterLogTab } from "./rest/CharacterLogTab";
import { DmRestActions } from "./rest/DmRestActions";
import { CombatTab } from "./CombatTab";
import { LevelUpBadge } from "./LevelUpBadge";
import { MagicTab } from "./MagicTab";
import { PendingChoicesBadge } from "./PendingChoicesBadge";
import { ProfileProvider, useProfile } from "./ProfileContext";
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
import { systemUiOf } from "@/components/systems";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { useSeenOnOpen } from "@/lib/hooks/notifications";
import { cn } from "@/lib/utils";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";

const ProfileEditor = dynamic(() => import("./ProfileEditor").then((m) => m.ProfileEditor), { ssr: false, loading: () => <LoadingState /> });

const VIEW_TABS: ProfileTabId[] = ["combat", "skills", "magic", "advancement", "downtime", "items", "story", "log"];

function viewTabs({ withLog, withPath, withMagic: Magic, withAdvancement: Advancement, withDowntime: Downtime, withItems }: { withLog: boolean; withPath: boolean; withMagic: ComponentType | false; withAdvancement: ComponentType | false; withDowntime: ComponentType | false; withItems: boolean }, t: (key: ProfileTabId | "path") => string): ProfileTab[] {
  const tabs: ProfileTab[] = [
    { id: "combat", label: t("combat"), content: <CombatTab /> },
    ...(withPath ? [{ id: "skills" as const, label: t("path"), content: <SkillsTab /> }] : []),
    ...(Magic ? [{ id: "magic" as const, label: t("magic"), content: <Magic /> }] : []),
    ...(Advancement ? [{ id: "advancement" as const, label: t("advancement"), content: <Advancement /> }] : []),
    ...(Downtime ? [{ id: "downtime" as const, label: t("downtime"), content: <Downtime /> }] : []),
    ...(withItems ? [{ id: "items" as const, label: t("items"), content: <InventoryTab /> }] : []),
    { id: "story", label: t("story"), content: <StoryTab /> },
  ];

  return withLog ? [...tabs, { id: "log", label: t("log"), content: <CharacterLogTab /> }] : tabs;
}

function LevelSeen() {
  const { campaignId, sheet } = useProfile();

  useSeenOnOpen(campaignId, { types: ["level"], enabled: sheet.viewer.isOwner && !sheet.viewer.isDM });

  return null;
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
  return <div className={cn(HUD_SURFACE, "mx-auto min-h-dvh max-w-3xl pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] lg:max-w-5xl bg-[radial-gradient(120%_60%_at_50%_0%,var(--palette-secondary,#2a221a),var(--palette-background,#110e0b)_70%)]")}>{children}</div>;
}

const asTab = (v: string | undefined): ProfileTabId => {
  const id = v === "stash" ? "items" : v;

  return id && (VIEW_TABS as string[]).includes(id) ? (id as ProfileTabId) : "combat";
};

export function CharacterProfile({ campaignId, characterId, canEdit, initialTab }: { campaignId: string; characterId: string; canEdit: boolean; initialTab?: string }) {
  const t = useTranslations("characterProfile");

  const tc = useTranslations("common.actions");

  const query = useCharacterSheet(campaignId, characterId);

  const [tab, setTabState] = useState<ProfileTabId>(() => asTab(initialTab));

  const [seenInitialTab, setSeenInitialTab] = useState(initialTab);

  if (seenInitialTab !== initialTab) {
    // navigation to the same route with another ?tab= (e.g. a toast link) must switch the tab
    setSeenInitialTab(initialTab);
    setTabState(asTab(initialTab));
  }

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
      {(sheet) => {
        const system = RULE_SYSTEM_REGISTRY[sheet.system];

        const tabs = viewTabs({ withLog: !!sheet.rest, withPath: !systemUiOf(sheet.system).hideProgression, withMagic: system.spells && (systemUiOf(sheet.system).MagicTab ?? MagicTab), withAdvancement: (sheet.viewer.isDM || sheet.viewer.isOwner) && (systemUiOf(sheet.system).AdvancementTab ?? false), withDowntime: (sheet.viewer.isDM || sheet.viewer.isOwner) && (systemUiOf(sheet.system).DowntimeTab ?? false), withItems: system.inventory }, (id) => t(`tabs.${id}`));

        return (
        <ProfileProvider campaignId={campaignId} characterId={characterId} sheet={sheet} canEdit={canEdit && sheet.viewer.isDM}>
          <ProfileShell>
            <LevelSeen />
            {editing ? (
              <ProfileEditor onDone={() => setEditing(false)} />
            ) : (
              <>
                <ProfileHero
                  ref={hero.ref}
                  badge={
                    <>
                      {!systemUiOf(sheet.system).hideProgression && <LevelUpBadge free={sheet.progression.freePoints} onOpen={() => setTab("skills")} />}
                      <PendingChoicesBadge />
                    </>
                  }
                  actions={
                    canEdit && sheet.viewer.isDM ? (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                          {tc("edit")}
                        </Button>
                        <DmRestActions />
                      </>
                    ) : null
                  }
                />
                {sheet.viewer.isOwner && !sheet.viewer.isDM && !sheet.review.pending && <PlayerSheetHint className="mx-3 my-2" />}
                {sheet.review.pending && <DraftBanner campaignId={campaignId} note={sheet.review.note} isOwner={sheet.viewer.isOwner} />}
                {sheet.review.pending && sheet.viewer.isDM && canEdit && <ReviewActions campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />}
                <ProfileTabs value={tabs.some((x) => x.id === tab) ? tab : "combat"} onValueChange={setTab} tabs={tabs} header={hero.past ? <CompactHero /> : null} />
                {!systemUiOf(sheet.system).hideProgression && <LevelUpOverlay campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />}
              </>
            )}
          </ProfileShell>
        </ProfileProvider>
        );
      }}
    </QueryState>
  );
}
