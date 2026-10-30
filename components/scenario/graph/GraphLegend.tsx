"use client";

import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

import { GRAPH_STATUS_COLOR } from "./GraphNodeShape";

import { MENTION_TYPES } from "@/lib/constants/scenario";
import { GRAPH_TYPE_STYLE } from "@/lib/constants/scenario-graph";

const item = "flex items-center gap-1.5";

export function GraphLegend({ showSequence }: { showSequence: boolean }) {
  const t = useTranslations("scenarioGraph.legend");

  const tType = useTranslations("scenario.mentionTypes");

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-col gap-1 rounded-md border bg-card/85 px-3 py-2 text-[13px] text-muted-foreground backdrop-blur-sm" aria-label={t("title")} role="group">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {(["draft", "ready", "personal"] as const).map((s) => (
          <span key={s} className={item}>
            <span className="h-3.5 w-1 rounded-sm" style={{ background: GRAPH_STATUS_COLOR[s] }} />
            {t(s)}
          </span>
        ))}
        {showSequence ? <span className={item}><span className="inline-block h-0 w-4 border-t-2 border-[var(--color-hud-gold-bright)]" />{t("sequence")}</span> : null}
        <span className={item}><span className="size-3.5 rounded-full border-2 border-dashed border-destructive" />{t("missing")}</span>
        <span className={item}><Lock className="size-3.5" aria-hidden />{t("secret")}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {MENTION_TYPES.map((type) => {
          const { icon: Icon, color } = GRAPH_TYPE_STYLE[type];

          return (
            <span key={type} className={item}>
              <Icon className="size-3.5" style={{ color }} aria-hidden />
              {tType(type)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
