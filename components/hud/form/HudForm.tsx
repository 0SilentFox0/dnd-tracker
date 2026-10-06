"use client";

import { type FormEvent, type ReactNode, useRef, useState } from "react";

import { type HudTab, HudTabs } from "./HudTabs";

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
  const formRef = useRef<HTMLFormElement>(null);

  const [innerTab, setInnerTab] = useState<T | undefined>(tabs?.[0]?.id);

  const active = tab ?? innerTab ?? tabs?.[0]?.id;

  const setActive = (next: T) => {
    setInnerTab(next);
    onTabChange?.(next);
  };

  // the browser cannot focus an invalid control inside a hidden tab, so reveal that tab first
  const onInvalidCapture = (e: FormEvent<HTMLFormElement>) => {
    if (!tabs || !active) return;

    const activeFields = formRef.current?.querySelectorAll<HTMLInputElement>(`[data-tab-id="${active}"] :is(input, textarea, select)`) ?? [];

    if (Array.from(activeFields).some((el) => el.willValidate && !el.validity.valid)) return;

    const target = e.target as HTMLElement;

    const owner = target.closest<HTMLElement>("[data-tab-id]")?.dataset.tabId as T | undefined;

    if (!owner || owner === active) return;

    setActive(owner);
    requestAnimationFrame(() => target.focus());
  };

  return (
    <form ref={formRef} id={id} onSubmit={onSubmit} onInvalidCapture={onInvalidCapture} className={cn("flex flex-col", className)}>
      {tabs && active ? <HudTabs tabs={tabs} value={active} onValueChange={setActive} keepMounted /> : <div className="px-4 py-3">{children}</div>}
      <ActionBar className="mt-auto border-[#3a2e22] bg-[#110e0b]/95 px-4 sm:px-4 sm:pb-4">{actions}</ActionBar>
    </form>
  );
}
