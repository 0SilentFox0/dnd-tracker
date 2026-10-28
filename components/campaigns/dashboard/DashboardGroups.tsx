"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { HudTile } from "@/components/hud/page";
import { COMPACT_GROUPS, DASHBOARD_GROUP_TITLE, type DashboardContext, type DashboardGroupKey, type DashboardSection, DEFAULT_DASHBOARD_CONTEXT, dmDashboardSectionsFor, PLAYER_DASHBOARD_SECTIONS } from "@/lib/constants/campaign-dashboard";
import { useSearch } from "@/lib/hooks/common";

const fieldsOf = (s: DashboardSection) => [s.title, ...s.keywords];

const GROUP_ORDER: DashboardGroupKey[] = ["game", "heroes", "libraries"];

const GRID = "grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3";

const COMPACT_GRID = "grid grid-cols-2 gap-2 sm:grid-cols-3";

export function DashboardGroups({ campaignId, isDM, pendingDrafts, context = DEFAULT_DASHBOARD_CONTEXT, hiddenKeys }: { campaignId: string; isDM: boolean; pendingDrafts: number; context?: DashboardContext; hiddenKeys?: string[] }) {
  const router = useRouter();

  const sections = isDM ? dmDashboardSectionsFor(context) : PLAYER_DASHBOARD_SECTIONS;

  const base = useMemo(() => sections.filter((s) => !hiddenKeys?.includes(s.key)), [sections, hiddenKeys]);

  const { query, items, isActive } = useSearch(base, fieldsOf);

  const tile = (s: DashboardSection, compact = false) => {
    const Icon = s.icon;

    const subtitle = s.key === "characters" && pendingDrafts > 0 ? `${s.subtitle} · ${pendingDrafts} на схваленні` : s.subtitle;

    return <HudTile key={s.key} href={s.href(campaignId)} icon={<Icon className="size-5" />} title={s.title} subtitle={subtitle} compact={compact} />;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isActive && items[0]) router.push(items[0].href(campaignId));
  };

  let content;

  if (isActive) {
    content = items.length ? <div className={GRID}>{items.map((s) => tile(s))}</div> : <SearchEmptyState query={query.value} onClear={() => query.set("")} />;
  } else if (!isDM) {
    content = <div className={GRID}>{base.map((s) => tile(s))}</div>;
  } else {
    content = (
      <div className="space-y-4">
        {GROUP_ORDER.map((g) => {
          const compact = COMPACT_GROUPS.has(g);

          return (
            <section key={g} className="space-y-2">
              <h2 className="hud-sc text-sm text-hud-muted">{DASHBOARD_GROUP_TITLE[g]}</h2>
              <div className={compact ? COMPACT_GRID : GRID}>{base.filter((s) => s.group === g).map((s) => tile(s, compact))}</div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit}>
        <SearchInput value={query.value} onChange={query.set} label="Пошук розділу" placeholder="Куди йдемо? (закл, моби, бої…)" />
      </form>
      {content}
    </div>
  );
}
