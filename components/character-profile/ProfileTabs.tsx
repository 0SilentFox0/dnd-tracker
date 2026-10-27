"use client";

import type { ReactNode } from "react";

import { type HudTab, HudTabs } from "@/components/hud/form";

export type ProfileTabId = "basic" | "combat" | "skills" | "magic" | "items" | "story";

export type ProfileTab = HudTab<ProfileTabId>;

export function ProfileTabs({ tabs, value, onValueChange, header }: { tabs: ProfileTab[]; value: ProfileTabId; onValueChange: (id: ProfileTabId) => void; header?: ReactNode }) {
  return <HudTabs tabs={tabs} value={value} onValueChange={onValueChange} header={header} triggerClassName="min-w-0 shrink px-1" />;
}
