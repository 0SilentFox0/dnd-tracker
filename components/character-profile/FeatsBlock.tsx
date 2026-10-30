"use client";

import { useTranslations } from "next-intl";

import { useProfile } from "./ProfileContext";

import { HudSection } from "@/components/hud/form";
import { HudPill } from "@/components/hud/page";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { TextRef } from "@/types/choices";

export function FeatsBlock() {
  const { sheet } = useProfile();

  const t = useTranslations("characterProfile.feats");

  const tr = useTranslator();

  const show = (ref: TextRef) => translateIssue(tr, ref);

  const choices = sheet.choices;

  if (!choices || (choices.feats.length === 0 && choices.options.length === 0)) return null;

  return (
    <HudSection title={t("title")}>
      <ul className="space-y-2 text-sm">
        {choices.feats.map((f) => (
          <li key={f.key} className="flex flex-wrap items-baseline gap-2">
            <span className="text-hud-ink">{f.name}</span>
            <HudPill>{tr(`feats.types.${f.type}`)}</HudPill>
            <span className="text-xs text-hud-muted">{[f.from, ...f.picks].map(show).join(" · ")}</span>
          </li>
        ))}
        {choices.options.map((o) => (
          <li key={`${o.owner}:${o.label}`} className="text-hud-muted">{`${o.label}: ${o.names.join(", ")}`}</li>
        ))}
      </ul>
    </HudSection>
  );
}
