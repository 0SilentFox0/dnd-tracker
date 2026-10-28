"use client";

import { useProfile } from "./ProfileContext";

import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { FEAT_TYPE_LABELS } from "@/lib/constants/choices";

export function FeatsBlock() {
  const { sheet } = useProfile();

  const choices = sheet.choices;

  if (!choices || (!choices.background && choices.feats.length === 0 && choices.options.length === 0)) return null;

  return (
    <HudSection title="Риси й вибори">
      {choices.background && <div className="mb-3 space-y-2 text-sm">
        <p className="text-hud-ink">Передісторія: {choices.background.name}</p>
        {choices.background.picks.length > 0 && <p>{choices.background.picks.join(" · ")}</p>}
        {choices.background.equipmentText && <p className="whitespace-pre-line text-hud-muted">{choices.background.equipmentText}<br />Спорядження й гроші видає ДМ вручну.</p>}
      </div>}
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
