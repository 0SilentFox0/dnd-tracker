"use client";

import { Loader2, Sparkles } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppearanceSave } from "@/lib/hooks/useAppearanceSave";
import type { SpellForReference } from "@/lib/types/info-reference";
import { formatMechanicsSpell } from "@/lib/utils/info-reference";

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
  const { value: appearance, setValue: setAppearance, saving, save } = useAppearanceSave(
    campaignId,
    spell.id,
    "spell",
    spell.appearanceDescription ?? ""
  );
  const imageUrl = spell.icon || null;

  return (
    <AccordionItem
      value={spell.id}
      className="rounded-lg border bg-card overflow-hidden"
    >
      <AccordionTrigger className="p-0 flex-col items-stretch hover:no-underline">
        <div className="aspect-square w-full relative bg-muted/50 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 opacity-50" />
            </div>
          )}
        </div>
        <div className="p-3 text-left">
          <span className="font-medium text-sm leading-tight block">
            {spell.name}
          </span>
          <span className="text-muted-foreground text-xs">
            рів. {spell.level}
            {spell.groupName ? ` · ${spell.groupName}` : ""}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-3 pb-3 pt-1 space-y-3 border-t">
          <div>
            <Label className="text-muted-foreground text-xs">Механіка</Label>
            <p className="text-sm mt-0.5">{formatMechanicsSpell(spell)}</p>
          </div>
          {spell.description && (
            <div>
              <Label className="text-muted-foreground text-xs">Опис</Label>
              <p className="text-sm mt-0.5">{spell.description}</p>
            </div>
          )}
          {spell.effects.length > 0 && (
            <div>
              <Label className="text-muted-foreground text-xs">Ефекти</Label>
              <ul className="list-disc list-inside text-sm mt-0.5 space-y-0.5">
                {spell.effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label className="text-muted-foreground text-xs">
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
