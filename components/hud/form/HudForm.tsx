"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import { type HudTab, HudTabs } from "./HudTabs";
import { useRevealInvalidTab } from "./reveal-invalid-tab";

import { ActionBar } from "@/components/common/ActionBar";
import { cn } from "@/lib/utils";

interface HudFormProps<T extends string> {
  id: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  tabs?: HudTab<T>[];
  tab?: T;
  onTabChange?: (tab: T) => void;
  children?: ReactNode;
  actions: ReactNode;
  className?: string;
}

export function HudForm<T extends string>({ id, onSubmit, tabs, tab, onTabChange, children, actions, className }: HudFormProps<T>) {
  const [innerTab, setInnerTab] = useState<T | undefined>(tabs?.[0]?.id);

  const active = tab ?? innerTab ?? tabs?.[0]?.id;

  const setActive = (next: T) => {
    setInnerTab(next);
    onTabChange?.(next);
  };

  const onInvalidCapture = useRevealInvalidTab(tabs ? active : undefined, setActive);

  return (
    <form id={id} onSubmit={onSubmit} onInvalidCapture={onInvalidCapture} className={cn("flex flex-1 flex-col", className)}>
      {tabs && active ? <HudTabs tabs={tabs} value={active} onValueChange={setActive} keepMounted /> : <div className="px-4 py-3">{children}</div>}
      <ActionBar className="mt-auto flex-wrap [&>*]:min-w-fit border-hud-rule bg-[#110e0b]/95 px-4 sm:px-4 sm:pb-4">{actions}</ActionBar>
    </form>
  );
}
