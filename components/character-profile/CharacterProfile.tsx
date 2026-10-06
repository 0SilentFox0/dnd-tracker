"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CombatTab } from "./CombatTab";
import { ProfileContext } from "./ProfileContext";
import { CompactHero, ProfileHero } from "./ProfileHero";
import { type ProfileTab, type ProfileTabId, ProfileTabs } from "./ProfileTabs";

import "@/components/hud/hud.css";
import { HUD_SURFACE } from "@/components/battle/hud";
import { QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useCharacterSheet } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

const VIEW_TABS: ProfileTabId[] = ["combat", "skills", "magic", "items", "story"];

function viewTabs(): ProfileTab[] {
  return [
    { id: "combat", label: "Бій", content: <CombatTab /> },
    { id: "skills", label: "Вміння", content: null },
    { id: "magic", label: "Магія", content: null },
    { id: "items", label: "Речі", content: null },
    { id: "story", label: "Історія", content: null },
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
            <ProfileHero
              ref={hero.ref}
              actions={
                canEdit ? (
                  <Button type="button" size="sm" variant="outline">
                    Редагувати
                  </Button>
                ) : null
              }
            />
            <ProfileTabs value={tab} onValueChange={setTab} tabs={viewTabs()} header={hero.past ? <CompactHero /> : null} />
          </ProfileShell>
        </ProfileContext.Provider>
      )}
    </QueryState>
  );
}
