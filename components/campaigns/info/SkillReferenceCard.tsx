"use client";

import Image from "next/image";
import { Loader2, Sparkles } from "lucide-react";

import { isValidImageSrc } from "@/components/campaigns/info/image-url";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppearanceSave } from "@/lib/hooks/common";
import type { SkillForReference } from "@/lib/types/info-reference";
import {
  formatMechanicsSkill,
  getShortSkillSummary,
} from "@/lib/utils/info-reference";

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
  const {
    value: appearance,
    setValue: setAppearance,
    saving,
    save,
  } = useAppearanceSave(
    campaignId,
    skill.id,
    "skill",
    skill.appearanceDescription ?? "",
  );

  const shortSummary = getShortSkillSummary(skill);

  return (
    <AccordionItem
      value={skill.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#4a3c2c] bg-[#1a140f]">
            {isValidImageSrc(skill.icon) ? (
              <Image
                src={skill.icon}
                alt=""
                width={40}
                height={40}
                className="object-cover size-full"
              />
            ) : (
              <Sparkles className="size-5 text-[#8f8473]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="hud-sc block text-sm leading-tight text-[#efe5d2]">
              {skill.name}
            </span>
            {skill.mainSkillName && (
              <span
                className="mt-1 inline-block rounded-full px-2 text-xs text-[#e6dccb] shadow-[inset_0_0_0_1px_#4a3c2c]"
                style={skill.mainSkillColor ? { boxShadow: `inset 0 0 0 1px ${skill.mainSkillColor}` } : undefined}
              >
                {skill.mainSkillName}
              </span>
            )}
            <p className="mt-1.5 line-clamp-2 text-xs text-[#8f8473]">
              {appearance.trim() ? appearance : shortSummary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-[#4a3c2c] px-3 pt-2 pb-3 text-[#e6dccb]">
          {skill.description && (
            <div>
              <Label className="hud-sc text-xs text-[#c9b37a]">
                Опис / механіка
              </Label>
              <p className="text-sm mt-0.5">{skill.description}</p>
            </div>
          )}
          <div>
            <Label className="hud-sc text-xs text-[#c9b37a]">
              Як діє (бонуси, ефекти, тригери)
            </Label>
            <p className="text-sm mt-0.5">{formatMechanicsSkill(skill)}</p>
          </div>
          <div>
            <Label className="hud-sc text-xs text-[#c9b37a]">
              Опис вигляду (як виглядає в грі)
            </Label>
            {isDM ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Наприклад: яскрава вогняна сфера, що летить до цілі..."
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
                    "Зберегти опис вигляду"
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
