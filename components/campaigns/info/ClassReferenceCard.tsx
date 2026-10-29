import { useTranslations } from "next-intl";
import { GraduationCap } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { useTranslator } from "@/lib/i18n/use-translator";
import { classSummaryText } from "@/lib/utils/campaigns/info-reference";
import type { ClassFeatureForReference, ClassForReference } from "@/types/info-reference";

function FeatureList({ features }: { features: ClassFeatureForReference[] }) {
  const t = useTranslations("dashboard.reference.card");

  return (
    <ul className="mt-1 space-y-2 text-sm">
      {features.map((f, i) => (
        <li key={i}>
          <span className="hud-sc text-hud-gold">{t("levelShort", { level: f.level })}</span>
          {f.name && <span className="ml-2 font-medium text-hud-ink">{f.name}</span>}
          {f.description && <p className="mt-0.5 whitespace-pre-line text-hud-bone">{f.description}</p>}
        </li>
      ))}
    </ul>
  );
}

export function ClassReferenceCard({ gameClass }: { gameClass: ClassForReference }) {
  const t = useTranslations("dashboard.reference.card");

  const translate = useTranslator();

  const { subclasses } = gameClass;

  const summary = gameClass.summary.map((line) => classSummaryText(translate, line));

  return (
    <AccordionItem
      value={gameClass.id}
      className="overflow-hidden rounded-lg border shadow-[inset_0_0_0_1px_rgba(230,194,90,.12)] last:border-b"
    >
      <AccordionTrigger className="p-0 hover:no-underline [&[data-state=open]>div]:border-b flex items-center gap-3">
        <div className="flex w-full min-w-0 flex-1 items-start gap-3 p-3 text-left tracking-normal [font-family:var(--font-hud-sans)]">
          <EntityIcon src={gameClass.icon} name={gameClass.name} size={40} className="size-10 rounded-lg border border-hud-line bg-hud-field text-hud-muted" fallback={<GraduationCap className="size-5" />} />
          <div className="min-w-0 flex-1">
            <span className="hud-sc block text-sm leading-tight text-hud-ink">{gameClass.name}</span>
            <p className="mt-1.5 line-clamp-2 text-xs text-hud-muted">{summary.slice(0, 2).join(" · ")}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 border-t border-hud-line px-3 pt-2 pb-3 text-hud-bone">
          <ul className="list-inside list-disc space-y-0.5 text-sm">
            {summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {gameClass.features.length > 0 && (
            <div>
              <Label className="hud-sc text-xs text-hud-gold">{t("featuresByLevel")}</Label>
              <FeatureList features={gameClass.features} />
            </div>
          )}
          {subclasses.map((s) => (
            <div key={s.id}>
              <Label className="hud-sc text-xs text-hud-gold">{t("subclass", { name: s.name })}</Label>
              <FeatureList features={s.features} />
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
