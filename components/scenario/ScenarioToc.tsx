"use client";

import type { MouseEvent } from "react";

import { scenarioFontClassName } from "./fonts";
import { SectionIcon } from "./SectionIcon";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useActiveSection } from "@/lib/hooks/scenario";
import { cn } from "@/lib/utils";
import { type PlayedLookup, sectionDone } from "@/lib/utils/scenario/reveal";
import { sectionIcon } from "@/lib/utils/scenario/section-icon";
import type { ScenarioSection, SectionIconKey } from "@/types/scenario";

export interface TocItem {
  id: string;
  title: string;
  icon: SectionIconKey;
  done: boolean;
}

export function tocItems(sections: ScenarioSection[], isHero: boolean, played?: PlayedLookup): TocItem[] {
  return sections.map((s) => ({ id: s.id, title: s.title, icon: sectionIcon(s), done: sectionDone(s, isHero, played).done }));
}

type Props = { items: TocItem[]; inline: boolean; drawer: { open: boolean; onOpenChange: (open: boolean) => void }; onPick?: (id: string) => void };

function TocList({ items, onPick }: { items: TocItem[]; onPick: (id: string, event: MouseEvent<HTMLAnchorElement>) => void }) {
  const active = useActiveSection(items.map((i) => i.id));

  return (
    <nav aria-label="Розділи" className="sb-toc-list">
      {items.map((i) => (
        <a key={i.id} href={`#sec-${i.id}`} data-toc={i.id} data-done={i.done || undefined} aria-current={active === i.id ? "location" : undefined} className={cn(active === i.id && "is-active")} onClick={(e) => onPick(i.id, e)}>
          <SectionIcon name={i.icon} className="sb-toc-icon" />
          <span className="sb-toc-title">{i.title}</span>
          {i.done && <span className="sb-toc-done" aria-label="зіграно">✓</span>}
        </a>
      ))}
    </nav>
  );
}

export function ScenarioToc({ items, inline, drawer, onPick }: Props) {
  if (inline) return <aside className="sb-toc"><TocList items={items} onPick={(id) => onPick?.(id)} /></aside>;

  // на iOS vaul фіксує body і при закритті повертає стару прокрутку — переходимо вже після закриття
  const pick = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onPick?.(id);
    drawer.onOpenChange(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.getElementById(`sec-${id}`)?.scrollIntoView({ block: "start" });
        history.replaceState(null, "", `#sec-${id}`);
      }),
    );
  };

  return (
    <ResponsiveDialog hud open={drawer.open} onOpenChange={drawer.onOpenChange} title="Розділи" size="sm">
      <div className={cn("scenario-book sb-toc-drawer", scenarioFontClassName)} data-theme="dark"><TocList items={items} onPick={pick} /></div>
    </ResponsiveDialog>
  );
}
