import { useTranslations } from "next-intl";
import { Gem } from "lucide-react";

import { AbilityFlowList } from "@/components/abilities/AbilityFlow";
import { EntityIcon } from "@/components/common/EntityIcon";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { useText } from "@/lib/i18n/use-text";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { ArtifactForReference } from "@/types/info-reference";

export function ArtifactReferenceCard({ artifact }: { artifact: ArtifactForReference }) {
  const t = useTranslations("dashboard.reference.card");

  const text = useText();

  const ta = useTranslator("artifacts");

  const meta = [artifact.rarity ? ta(`rarity.${artifact.rarity}`) : null, ta(`slots.${artifact.slot}`)].filter(Boolean).join(" · ");

  return (
    <AccordionItem
      value={artifact.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <EntityIcon src={artifact.icon} name={artifact.name} size={40} className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted" fallback={<Gem className="size-5" />} />
          <div className="flex-1 min-w-0">
            <span className="hud-sc block text-sm leading-tight text-hud-ink">
              {artifact.name}
            </span>
            <span className="text-xs text-hud-muted">{meta}</span>
            <p className="mt-1.5 text-xs text-hud-muted">
              {artifact.gear ? t("gear") : artifact.holderName ? t("heldBy", { name: artifact.holderName }) : t("free")}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
          {artifact.description && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">{t("description")}</Label>
              <p className="text-sm mt-0.5">{artifact.description}</p>
            </div>
          )}
          {artifact.effects.length > 0 && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">{t("effects")}</Label>
              <div className="mt-1">
                <AbilityFlowList lines={artifact.effects} />
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
