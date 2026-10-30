"use client";

import { useTranslations } from "next-intl";

import { HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SheetBackground } from "@/types/choices";

interface BackgroundSectionProps {
  background?: SheetBackground;
  canEdit: boolean;
  onOpen: (pickKey: string) => void;
}

export function BackgroundSection({ background, canEdit, onOpen }: BackgroundSectionProps) {
  const t = useTranslations("characterProfile.path.background");

  const tg = useTranslations("gameTerms");

  const tr = useTranslator();

  if (!background) {
    if (!canEdit) return null;

    return (
      <section className="mb-3 flex flex-wrap items-center gap-2 text-sm text-hud-muted">
        <span>{t("none")}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => onOpen("background")}>
          {t("pick")}
        </Button>
      </section>
    );
  }

  const { name, description, skills, tools, originFeat, equipmentText, picks, open, openKey } = background;

  return (
    <section className="mb-3 space-y-2 text-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="hud-sc inline">{t("title", { name })}</h3>
        {open > 0 && <HudPill tone="accent">{t("open", { count: open })}</HudPill>}
        {canEdit && (
          <Button type="button" size="sm" variant="outline" onClick={() => onOpen("background")}>
            {t("change")}
          </Button>
        )}
        {canEdit && open > 0 && (
          <Button type="button" size="sm" onClick={() => onOpen(openKey ?? "background")}>
            {t("pick")}
          </Button>
        )}
      </div>
      {description && (
        <details className="text-hud-muted">
          <summary className="cursor-pointer">{t("description")}</summary>
          <p className="mt-1 whitespace-pre-line">{description}</p>
        </details>
      )}
      {skills.length > 0 && <p>{`${t("skills")}: ${skills.map((s) => tg(`dndSkills.${s}`)).join(", ")}`}</p>}
      {tools.length > 0 && <p>{`${t("tools")}: ${tools.join(", ")}`}</p>}
      {originFeat && <p>{`${t("originFeat")}: ${originFeat.name}`}</p>}
      {picks.length > 0 && <p>{picks.map((p) => translateIssue(tr, p)).join(" · ")}</p>}
      {equipmentText && (
        <p className="whitespace-pre-line text-hud-muted">
          {`${t("equipment")}: ${equipmentText}`}
          <br />
          {t("equipmentNote")}
        </p>
      )}
    </section>
  );
}
