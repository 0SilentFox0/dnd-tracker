"use client";

import { useProfile } from "./ProfileContext";

import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";

export function FeatsBlock() {
  const { sheet } = useProfile();

  const choices = sheet.choices;

  if (!choices || (choices.feats.length === 0 && choices.options.length === 0)) return null;

  return (
    <HudSection title="Риси й вибори">
      <ul className="space-y-2 text-sm">
        {choices.feats.map((f) => (
          <li key={f.key} className="flex flex-wrap items-baseline gap-2">
            <span className="text-hud-ink">{f.name}</span>
            <HudPill>{FEAT_TYPE_LABELS[f.type]}</HudPill>
            <span className="text-xs text-hud-muted">{[f.from, ...f.picks].join(" · ")}</span>
          </li>
        ))}
        {choices.options.map((o) => (
          <li key={`${o.owner}:${o.label}`} className="text-hud-muted">{`${o.label}: ${o.names.join(", ")}`}</li>
        ))}
      </ul>
    </HudSection>
  );
}
