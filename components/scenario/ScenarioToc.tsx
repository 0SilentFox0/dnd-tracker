"use client";

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

function TocList({ items, onPick }: { items: TocItem[]; onPick: (id: string) => void }) {
  const active = useActiveSection(items.map((i) => i.id));

  return (
    <nav aria-label="Розділи" className="sb-toc-list">
      {items.map((i) => (
        <a key={i.id} href={`#sec-${i.id}`} data-toc={i.id} data-done={i.done || undefined} aria-current={active === i.id ? "location" : undefined} className={cn(active === i.id && "is-active")} onClick={() => onPick(i.id)}>
          <SectionIcon name={i.icon} className="sb-toc-icon" />
          <span className="sb-toc-title">{i.title}</span>
          {i.done && <span className="sb-toc-done" aria-label="зіграно">✓</span>}
        </a>
      ))}
    </nav>
  );
}

export function ScenarioToc({ items, inline, drawer, onPick }: Props) {
  const pick = (id: string) => {
    onPick?.(id);
    drawer.onOpenChange(false);
  };

  if (inline) return <aside className="sb-toc"><TocList items={items} onPick={pick} /></aside>;

  return (
    <ResponsiveDialog hud open={drawer.open} onOpenChange={drawer.onOpenChange} title="Розділи" size="sm">
      <div className="scenario-book sb-toc-drawer"><TocList items={items} onPick={pick} /></div>
    </ResponsiveDialog>
  );
}
