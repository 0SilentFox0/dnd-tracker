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
import {
  formatMechanicsSpell,
  getShortSpellSummary,
} from "@/lib/utils/info-reference";
import type { SpellForReference } from "@/types/info-reference";

interface SpellReferenceCardProps {
  campaignId: string;
  spell: SpellForReference;
  isDM: boolean;
}

export function SpellReferenceCard({
  campaignId,
  spell,
  isDM,
}: SpellReferenceCardProps) {
  const {
    value: appearance,
    setValue: setAppearance,
    saving,
    save,
  } = useAppearanceSave(
    campaignId,
    spell.id,
    "spell",
    spell.appearanceDescription ?? "",
  );

  const shortSummary = getShortSpellSummary(spell);

  return (
    <AccordionItem
      value={spell.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#4a3c2c] bg-[#1a140f]">
            {isValidImageSrc(spell.icon) ? (
              <Image
                src={spell.icon}
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
              {spell.name}
            </span>
            <span className="text-xs text-[#8f8473]">
              рів. {spell.level}
              {spell.groupName ? ` · ${spell.groupName}` : ""}
            </span>
            <p className="mt-1.5 line-clamp-2 text-xs text-[#8f8473]">
              {appearance.trim() ? appearance : shortSummary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-[#4a3c2c] px-3 pt-2 pb-3 text-[#e6dccb]">
          <div>
            <Label className="hud-sc text-xs text-[#c9b37a]">Механіка</Label>
            <p className="text-sm mt-0.5">{formatMechanicsSpell(spell)}</p>
          </div>
          {spell.description && (
            <div>
              <Label className="hud-sc text-xs text-[#c9b37a]">Опис</Label>
              <p className="text-sm mt-0.5">{spell.description}</p>
            </div>
          )}
          {spell.effects.length > 0 && (
            <div>
              <Label className="hud-sc text-xs text-[#c9b37a]">Ефекти</Label>
              <ul className="list-disc list-inside text-sm mt-0.5 space-y-0.5">
                {spell.effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label className="hud-sc text-xs text-[#c9b37a]">
              Опис вигляду (як виглядає заклинання)
            </Label>
            {isDM ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder="Наприклад: вогняна куля, що вибухає яскравим полум'ям..."
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
                {spell.appearanceDescription || "—"}
              </p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
