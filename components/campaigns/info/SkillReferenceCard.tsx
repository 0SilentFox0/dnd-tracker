"use client";

import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateSkillAppearance } from "@/lib/hooks/skills";
import { useTranslator } from "@/lib/i18n/use-translator";
import {
  formatMechanicsSkill,
  getShortSkillSummary,
} from "@/lib/utils/campaigns/info-reference";
import type { SkillForReference } from "@/types/info-reference";

interface SkillReferenceCardProps {
  campaignId: string;
  skill: SkillForReference;
  isDM: boolean;
}

export function SkillReferenceCard({
  campaignId,
  skill,
  isDM,
}: SkillReferenceCardProps) {
  const { draft: { data: appearance, set: setAppearance }, status: { isSaving: saving }, save } = useUpdateSkillAppearance(
    campaignId,
    skill.id,
    skill.appearanceDescription ?? "",
  );

  const t = useTranslations("dashboard.reference.card");

  const translate = useTranslator();

  const shortSummary = getShortSkillSummary(skill, translate);

  return (
    <AccordionItem
      value={skill.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <EntityIcon src={skill.icon} name={skill.name} size={40} className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted" fallback={<Sparkles className="size-5" />} />
          <div className="flex-1 min-w-0">
            <span className="hud-sc block text-sm leading-tight text-hud-ink">
              {skill.name}
            </span>
            {skill.mainSkillName && (
              <span
                className="mt-1 inline-block rounded-full px-2 text-xs text-hud-bone shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
                style={skill.mainSkillColor ? { boxShadow: `inset 0 0 0 1px ${skill.mainSkillColor}` } : undefined}
              >
                {skill.mainSkillName}
              </span>
            )}
            <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
              {appearance.trim() ? appearance : shortSummary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
          {skill.description && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">
                {t("skillDescription")}
              </Label>
              <p className="text-sm mt-0.5">{skill.description}</p>
            </div>
          )}
          <div>
            <Label className="hud-sc text-xs text-hud-gold">
              {t("skillHow")}
            </Label>
            <p className="text-sm mt-0.5">{formatMechanicsSkill(skill, translate)}</p>
          </div>
          <div>
            <Label className="hud-sc text-xs text-hud-gold">
              {t("appearanceSkill")}
            </Label>
            {isDM ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder={t("appearancePlaceholderSkill")}
                  rows={3}
                  className="text-sm min-h-[80px]"
                />
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={save}
                  className="min-h-9 touch-manipulation"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("saveAppearance")
                  )}
                </Button>
              </div>
            ) : (
              <p className="text-sm mt-0.5">
                {skill.appearanceDescription || "—"}
              </p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
