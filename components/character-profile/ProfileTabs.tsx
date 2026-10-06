"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProfileTabId = "basic" | "combat" | "skills" | "magic" | "items" | "story";

export interface ProfileTab {
  id: ProfileTabId;
  label: string;
  content: ReactNode;
}

export function ProfileTabs({ tabs, value, onValueChange, header }: { tabs: ProfileTab[]; value: ProfileTabId; onValueChange: (id: ProfileTabId) => void; header?: ReactNode }) {
  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as ProfileTabId)}>
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-[#3a2e22] bg-[#110e0b]/95 backdrop-blur">
        {header}
        <TabsList className="flex h-auto w-full gap-1 rounded-none bg-transparent p-1.5">
          {tabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="profile-tab hud-sc h-10 min-w-0 flex-1 rounded-md px-1 text-[13px] text-[#8f8473] data-[state=active]:shadow-none">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-0 px-4 py-3">
          {t.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
