"use client";

import { type ReactNode, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

import { FLOW_BORDER, FLOW_TEXT, type FlowPart } from "./flow-part";
import { useAbilityText } from "./use-ability-text";

import { cn } from "@/lib/utils";
import type { AbilityFlowSummary, Segment } from "@/lib/utils/abilities/segments";

interface AbilityFlowProps {
  summary: AbilityFlowSummary;
  variant: "editor" | "card";
  onChipClick?: (part: FlowPart) => void;
}

export function AbilityFlow({ summary, variant, onChipClick }: AbilityFlowProps) {
  const t = useTranslations("abilities.flow");

  const text = useAbilityText();

  const compact = variant === "card";

  const chip = (part: FlowPart, key: string, body: string): ReactNode => {
    const className = cn("inline-flex min-w-0 items-baseline gap-1.5 rounded-md border bg-hud-field/60 px-2 py-0.5 text-left", compact ? "text-xs" : "text-sm", FLOW_BORDER[part], FLOW_TEXT[part]);

    const content = (
      <>
        <span className="hud-sc shrink-0 text-[10px] uppercase tracking-wide">{t(part)}</span>
        <span className="min-w-0 text-hud-bone">{body}</span>
      </>
    );

    return onChipClick ? (
      <button key={key} type="button" data-part={part} className={cn(className, "cursor-pointer hover:brightness-125")} onClick={() => onChipClick(part)}>
        {content}
      </button>
    ) : (
      <span key={key} data-part={part} className={className}>
        {content}
      </span>
    );
  };

  const chips = useMemo(() => {
    const one = (segs: Segment[]) => (segs.length ? [segs] : []);

    const groups: { part: FlowPart; items: Segment[][] }[] = [
      { part: "when", items: one(summary.when) },
      { part: "if", items: one(summary.if) },
      { part: "then", items: summary.then },
      { part: "limits", items: one(summary.limits) },
    ];

    return groups.filter((g) => g.items.length).map((g) => ({ part: g.part, bodies: g.items.map((segs) => text.segments(segs)) }));
  }, [summary, text]);

  const nodes = chips.flatMap((g, i) => [
    ...(i > 0 ? [<ChevronRight key={`arrow-${g.part}`} aria-hidden className="hidden size-3 shrink-0 self-center text-hud-muted sm:block" />] : []),
    ...g.bodies.map((body, j) => chip(g.part, `${g.part}-${j}`, body)),
  ]);

  return <div className="flex flex-wrap items-center gap-1">{nodes}</div>;
}

export function AbilityFlowList({ lines }: { lines: AbilityFlowSummary[] }) {
  if (!lines.length) return <p className="text-xs text-muted-foreground">—</p>;

  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i}>
          <AbilityFlow summary={line} variant="card" />
        </li>
      ))}
    </ul>
  );
}
