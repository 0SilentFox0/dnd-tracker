"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CombatTab } from "./CombatTab";
import { ItemsTab } from "./ItemsTab";
import { MagicTab } from "./MagicTab";
import { ProfileContext } from "./ProfileContext";
import { ProfileEditor } from "./ProfileEditor";
import { CompactHero, ProfileHero } from "./ProfileHero";
import { type ProfileTab, type ProfileTabId, ProfileTabs } from "./ProfileTabs";
import { SkillsTab } from "./SkillsTab";
import { StoryTab } from "./StoryTab";

import "@/components/hud/hud.css";
import { HUD_SURFACE } from "@/components/battle/hud";
import { QueryState } from "@/components/common/states";
import { FreePointBadge, LevelUpOverlay } from "@/components/skill-tree/progression";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

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

export function CharacterProfile({ campaignId, characterId, canEdit }: { campaignId: string; characterId: string; canEdit: boolean }) {
  const query = useCharacterSheet(campaignId, characterId);

  const router = useRouter();

  const pathname = usePathname();

  const params = useSearchParams();

  const fromUrl = params.get("tab") as ProfileTabId | null;

  const tab: ProfileTabId = fromUrl && VIEW_TABS.includes(fromUrl) ? fromUrl : "combat";

  const hero = useScrolledPast();

  const [editing, setEditing] = useState(false);

  const setTab = (id: ProfileTabId) => {
    const next = new URLSearchParams(params.toString());

    next.set("tab", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  return (
    <QueryState query={query}>
      {(sheet) => (
        <ProfileContext.Provider value={{ campaignId, characterId, sheet, canEdit }}>
          <ProfileShell>
            {editing ? (
              <ProfileEditor onDone={() => setEditing(false)} />
            ) : (
              <>
                <ProfileHero
                  ref={hero.ref}
                  actions={
                    canEdit ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                        Редагувати
                      </Button>
                    ) : null
                  }
                />
                <div className="px-4 empty:hidden">
                  <FreePointBadge campaignId={campaignId} characterId={characterId} />
                </div>
                <ProfileTabs value={tab} onValueChange={setTab} tabs={viewTabs()} header={hero.past ? <CompactHero /> : null} />
                <LevelUpOverlay campaignId={campaignId} characterId={characterId} name={sheet.identity.name} />
              </>
            )}
          </ProfileShell>
        </ProfileContext.Provider>
      )}
    </QueryState>
  );
}
