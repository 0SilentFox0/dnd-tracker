"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface HudTab<T extends string = string> {
  id: T;
  label: ReactNode;
  content: ReactNode;
  invalid?: boolean;
}

interface HudTabsProps<T extends string> {
  tabs: HudTab<T>[];
  value: T;
  onValueChange: (id: T) => void;
  header?: ReactNode;
  keepMounted?: boolean;
  contentClassName?: string;
  triggerClassName?: string;
}

export function HudTabs<T extends string>({ tabs, value, onValueChange, header, keepMounted = false, contentClassName, triggerClassName }: HudTabsProps<T>) {
  const t = useTranslations("common");

  return (
    <Tabs value={value} onValueChange={(v) => onValueChange(v as T)}>
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-hud-rule bg-[#110e0b]/[.97]">
        {header}
        <TabsList className="hud-scroll-x flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-1.5">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn("profile-tab hud-sc h-10 min-w-fit flex-1 shrink-0 rounded-md px-2.5 text-[13px] text-hud-muted data-[state=active]:shadow-none", triggerClassName)}
            >
              {tab.label}
              {tab.invalid && <span data-invalid-dot aria-label={t("ui.hasErrors")} className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-hud-danger" />}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          data-tab-id={tab.id}
          forceMount={keepMounted ? true : undefined}
          className={cn("mt-0 px-4 py-3", keepMounted && "data-[state=inactive]:hidden", contentClassName)}
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
