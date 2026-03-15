"use client";

import Image from "next/image";
import { Loader2, Sparkles } from "lucide-react";

import { isValidImageSrc } from "@/components/campaigns/info/image-url";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppearanceSave } from "@/lib/hooks/useAppearanceSave";
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
      className="rounded-lg border bg-card overflow-hidden"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="p-3 text-left flex flex-1 min-w-0 items-start gap-3 w-full">
          <div className="flex shrink-0 size-10 rounded-lg overflow-hidden bg-muted items-center justify-center">
            {isValidImageSrc(skill.icon) ? (
              <Image
                src={skill.icon}
                alt=""
                width={40}
                height={40}
                className="object-cover size-full"
              />
            ) : (
              <Sparkles className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm leading-tight block">
              {skill.name}
            </span>
            {skill.mainSkillName && (
              <Badge variant="secondary" className="text-xs shrink-0 mt-1">
                {skill.mainSkillName}
              </Badge>
            )}
            <p className="text-muted-foreground text-xs mt-1.5 line-clamp-2">
              {appearance.trim() ? appearance : shortSummary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-3 pb-3 pt-1 space-y-3 border-t">
          {skill.description && (
            <div>
              <Label className="text-muted-foreground text-xs">
                Опис / механіка
              </Label>
              <p className="text-sm mt-0.5">{skill.description}</p>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground text-xs">
              Як діє (бонуси, ефекти, тригери)
            </Label>
            <p className="text-sm mt-0.5">{formatMechanicsSkill(skill)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">
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
