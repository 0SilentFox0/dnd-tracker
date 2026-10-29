"use client";

import { useTranslations } from "next-intl";
import { Loader2, Sparkles } from "lucide-react";

import { useAbilityText } from "@/components/abilities/use-ability-text";
import { EntityIcon } from "@/components/common/EntityIcon";
import { SpellBattlePreview } from "@/components/spells/preview/SpellBattlePreview";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateSpellAppearance } from "@/lib/hooks/spells";
import { useTranslator } from "@/lib/i18n/use-translator";
import {
  formatMechanicsSpell,
  getShortSpellSummary,
} from "@/lib/utils/campaigns/info-reference";
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
  const { draft: { data: appearance, set: setAppearance }, status: { isSaving: saving }, save } = useUpdateSpellAppearance(
    campaignId,
    spell.id,
    spell.appearanceDescription ?? "",
  );

  const t = useTranslations("dashboard.reference.card");

  const translate = useTranslator();

  const effects = useAbilityText().lines(spell.effects);

  const shortSummary = getShortSpellSummary(spell, translate);

  return (
    <AccordionItem
      value={spell.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <EntityIcon src={spell.icon} name={spell.name} size={40} className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted" fallback={<Sparkles className="size-5" />} />
          <div className="flex-1 min-w-0">
            <span className="hud-sc block text-sm leading-tight text-hud-ink">
              {spell.name}
            </span>
            <span className="text-xs text-hud-muted">
              {t("levelShort", { level: spell.level })}
              {spell.groupName ? ` · ${spell.groupName}` : ""}
            </span>
            <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">
              {appearance.trim() ? appearance : shortSummary}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
          <div>
            <Label className="hud-sc text-xs text-hud-gold">{t("mechanics")}</Label>
            <p className="text-sm mt-0.5">{formatMechanicsSpell(spell, translate)}</p>
          </div>
          {spell.description && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">{t("description")}</Label>
              <p className="text-sm mt-0.5">{spell.description}</p>
            </div>
          )}
          {spell.effects.length > 0 && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">{t("effects")}</Label>
              <ul className="list-disc list-inside text-sm mt-0.5 space-y-0.5">
                {effects.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <Label className="hud-sc text-xs text-hud-gold">
              {t("appearanceSpell")}
            </Label>
            {isDM ? (
              <div className="mt-1 space-y-2">
                <Textarea
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  placeholder={t("appearancePlaceholderSpell")}
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
                {spell.appearanceDescription || "—"}
              </p>
            )}
          </div>
          {spell.rules && (
            <SpellBattlePreview
              spell={{ id: spell.id, name: spell.name, level: spell.level, groupId: null, fx: spell.fx, rules: spell.rules }}
            />
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
