"use client";

import type { ReactNode } from "react";
import { ArrowRight, DoorOpen, LogOut, Moon, Route, Users } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPill } from "@/components/hud/page";
import { useTravelLog } from "@/lib/hooks/world";
import type { TravelKind, TravelRest, WorldTravelEntry } from "@/types/world";

const REST_LABEL: Record<Exclude<TravelRest, "none">, string> = { short: "Короткий відпочинок", long: "Довгий відпочинок" };

const KIND_BADGE: Record<TravelKind, { label: string; tone: "accent" | "muted" | "bone"; icon: ReactNode }> = {
  travel: { label: "Подорож", tone: "accent", icon: <Route className="size-3" aria-hidden /> },
  enter: { label: "Зайшли", tone: "bone", icon: <DoorOpen className="size-3" aria-hidden /> },
  rest: { label: "Відпочинок", tone: "muted", icon: <Moon className="size-3" aria-hidden /> },
  exit: { label: "Вийшли", tone: "muted", icon: <LogOut className="size-3" aria-hidden /> },
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);

  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

function TravelEntry({ e }: { e: WorldTravelEntry }) {
  const badge = KIND_BADGE[e.kind] ?? KIND_BADGE.travel;

  const when = formatWhen(e.createdAt);

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-[rgba(20,16,12,.85)] p-2.5 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <HudPill tone={badge.tone} icon={badge.icon}>
          {badge.label}
        </HudPill>
        {e.rest !== "none" ? (
          <HudPill tone="muted" icon={<Moon className="size-3" aria-hidden />}>
            {REST_LABEL[e.rest]}
          </HudPill>
        ) : null}
        {when ? <time dateTime={e.createdAt} className="ml-auto text-[11px] text-hud-muted">{when}</time> : null}
      </div>
      {e.kind === "rest" ? null : (
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-hud-ink">
          <span className="shrink-0 text-hud-muted">{e.mapName}</span>
          <ArrowRight className="size-3.5 shrink-0 text-hud-muted" aria-hidden />
          <span className="min-w-0 truncate font-medium">{e.toMarkerName ?? "Обрана точка"}</span>
        </p>
      )}
      <p className="flex items-start gap-1.5 text-xs text-hud-muted">
        <Users className="mt-0.5 size-3 shrink-0" aria-hidden />
        <span className="min-w-0">{e.heroes.map((h) => <span key={h.id} className="mr-1.5 inline-block text-hud-ink">{h.name}</span>)}</span>
      </p>
    </li>
  );
}

export function TravelLog({ campaignId }: { campaignId: string }) {
  const log = useTravelLog(campaignId);

  return (
    <QueryState query={log} empty={<EmptyState icon={Route} title="Подорожей ще не було" className="py-6" />}>
      {(entries) => (
        <ul className="hud-scroll-x flex max-h-72 flex-col gap-2 overflow-y-auto">
          {entries.map((e) => <TravelEntry key={e.id} e={e} />)}
        </ul>
      )}
    </QueryState>
  );
}
