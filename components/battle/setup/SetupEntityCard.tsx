"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { cn } from "@/lib/utils";
import { round1 } from "@/lib/utils/common/format";
import type { EntityStats } from "@/types/battle-setup";

interface SetupEntityCardProps {
  entity: { name: string; avatar?: string | null };
  fallbackIcon: string;
  title?: ReactNode;
  stats?: EntityStats;
  statsExtra?: ReactNode;
  state: { isSelected: boolean; isEnemy?: boolean; badge?: ReactNode };
  onToggle: () => void;
  /** Панель під карткою, видима лише для вибраного. */
  children?: ReactNode;
}

export function SetupEntityCard({ entity, fallbackIcon, title, stats, statsExtra, state, onToggle, children }: SetupEntityCardProps) {
  const { isSelected, isEnemy, badge } = state;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-xl border-2 transition-all",
        !isSelected && "border-border hover:border-primary/50 hover:bg-accent/50",
        isSelected && (isEnemy ? "border-red-500/70 bg-red-500/5 shadow-sm" : "border-primary bg-primary/10 shadow-sm"),
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 rounded-t-xl p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <EntityIcon src={entity.avatar} name={entity.name} alt={entity.name} size={56} className="size-14 rounded-lg" fallback={<span className="text-xl text-muted-foreground">{fallbackIcon}</span>} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold">
            {entity.name}
            {title}
          </span>
          {stats && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                DPR {round1(stats.dpr)} · HP {stats.hp} · KPI {stats.kpi}
              </span>
              {statsExtra}
            </div>
          )}
        </div>
        {isSelected && (
          <div className="flex shrink-0 items-center gap-2" aria-hidden>
            {badge}
            <div className="flex size-6 items-center justify-center rounded-full bg-primary">
              <Check className="size-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
        )}
      </button>
      {isSelected && children}
    </div>
  );
}
