"use client";

import { useEffect, useRef } from "react";

import { AcquaintanceNoteEditor } from "./AcquaintanceNoteEditor";

import { EntityIcon } from "@/components/common/EntityIcon";
import { NewPill } from "@/components/common/NewPill";
import { HudCard, HudPill } from "@/components/hud/page";
import type { AcquaintanceView } from "@/types/acquaintances";

interface Flags {
  isDM: boolean;
  isNew: boolean;
  focused: boolean;
}

export function AcquaintanceCard({ campaignId, item, flags }: { campaignId: string; item: AcquaintanceView; flags: Flags }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (flags.focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [flags.focused]);

  const own = item.notes.find((n) => n.own);

  const others = item.notes.filter((n) => !n.own);

  return (
    <div ref={ref} id={`acquaintance-${item.id}`} className="scroll-mt-20">
      <HudCard tone={flags.focused ? "active" : item.hidden ? "muted" : "default"} className="space-y-3">
        <div className="flex items-center gap-3">
          <EntityIcon src={item.avatarUrl} name={item.name} size={48} className="size-12 rounded-lg" />
          <h2 className="hud-sc min-w-0 flex-1 truncate text-lg text-hud-ink">{item.name}</h2>
          {flags.isNew && <NewPill />}
          {item.hidden && <HudPill tone="muted">Приховано</HudPill>}
        </div>
        {item.description && <p className="whitespace-pre-wrap text-sm">{item.description}</p>}
        {item.entries.length > 0 && (
          <ul className="space-y-1 text-sm">
            {item.entries.map((e) => (
              <li key={e.id} className={e.hidden ? "opacity-60" : undefined}>
                {e.text}
                {e.hidden && <span className="text-xs text-hud-muted"> · приховано</span>}
              </li>
            ))}
          </ul>
        )}
        {flags.isDM && others.length > 0 && (
          <ul className="space-y-1 border-t border-hud-rule pt-2 text-sm">
            {others.map((n) => (
              <li key={n.id}>
                <span className="font-semibold text-hud-gold">{n.authorName}</span>
                <p className="whitespace-pre-wrap">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
        <AcquaintanceNoteEditor campaignId={campaignId} acquaintanceId={item.id} initial={own?.text ?? ""} />
      </HudCard>
    </div>
  );
}
