"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, DoorOpen, LogOut, Moon, Route, Users } from "lucide-react";

import { EmptyState, QueryState } from "@/components/common/states";
import { HudPill } from "@/components/hud/page";
import { useTravelLog } from "@/lib/hooks/world";
import type { TravelKind, WorldTravelEntry } from "@/types/world";

const KIND_BADGE: Record<TravelKind, { tone: "accent" | "muted" | "bone"; icon: ReactNode }> = {
  travel: { tone: "accent", icon: <Route className="size-3" aria-hidden /> },
  enter: { tone: "bone", icon: <DoorOpen className="size-3" aria-hidden /> },
  rest: { tone: "muted", icon: <Moon className="size-3" aria-hidden /> },
  exit: { tone: "muted", icon: <LogOut className="size-3" aria-hidden /> },
};

const WHEN_FORMAT = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } as const;

function TravelEntry({ e }: { e: WorldTravelEntry }) {
  const t = useTranslations("world.travel");

  const format = useFormatter();

  const kind: TravelKind = e.kind in KIND_BADGE ? e.kind : "travel";

  const badge = KIND_BADGE[kind];

  const date = new Date(e.createdAt);

  const when = Number.isNaN(date.getTime()) ? "" : format.dateTime(date, WHEN_FORMAT);

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-[rgba(20,16,12,.85)] p-2.5 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <HudPill tone={badge.tone} icon={badge.icon}>
          {t(`kinds.${kind}`)}
        </HudPill>
        {e.rest !== "none" ? (
          <HudPill tone="muted" icon={<Moon className="size-3" aria-hidden />}>
            {t(`logRest.${e.rest}`)}
          </HudPill>
        ) : null}
        {when ? <time dateTime={e.createdAt} className="ml-auto text-[11px] text-hud-muted">{when}</time> : null}
      </div>
      {e.kind === "rest" ? null : (
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-hud-ink">
          <span className="shrink-0 text-hud-muted">{e.mapName}</span>
          <ArrowRight className="size-3.5 shrink-0 text-hud-muted" aria-hidden />
          <span className="min-w-0 truncate font-medium">{e.toMarkerName ?? t("pickedPoint")}</span>
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
  const t = useTranslations("world.travel");

  const log = useTravelLog(campaignId);

  return (
    <QueryState query={log} empty={<EmptyState icon={Route} title={t("logEmpty")} className="py-6" />}>
      {(entries) => (
        <ul className="hud-scroll-x flex max-h-72 flex-col gap-2 overflow-y-auto">
          {entries.map((e) => <TravelEntry key={e.id} e={e} />)}
        </ul>
      )}
    </QueryState>
  );
}
