"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Info } from "lucide-react";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useCampaignOnboarding } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { StepStatus } from "@/lib/onboarding/progress";
import { stepText } from "@/lib/onboarding/step-text";
import type { OnboardingRole } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

function StepRow({ step, role }: { step: StepStatus; role: OnboardingRole }) {
  const t = useTranslator("onboarding");

  const text = stepText(t, role, step);

  const Icon = step.informational ? Info : step.done ? CheckCircle2 : Circle;

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
      <Icon className={cn("mt-0.5 size-4 shrink-0", step.done ? "text-hud-gold" : "text-hud-muted")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", step.done ? "text-hud-muted line-through" : "text-hud-ink")}>{text.title}</p>
        {!step.done && <p className="text-xs text-hud-muted">{text.description}</p>}
      </div>
      <div className="ml-7 flex shrink-0 gap-1 sm:ml-0">
        {step.helpSlug && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/help/${step.helpSlug}`}>{t("ui.howTo")}</Link>
          </Button>
        )}
        {!step.done && step.href && (
          <Button variant="outline" size="sm" asChild>
            <Link href={step.href}>{t("ui.go")}</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

export function OnboardingChecklist({ campaignId }: { campaignId: string }) {
  const t = useTranslator("onboarding");

  const { data, hide } = useCampaignOnboarding(campaignId);

  if (!data || data.state === "hidden") return null;

  if (data.state === "collapsed") {
    return (
      <HudPanel className="flex items-center justify-between gap-2 text-sm">
        <span className="text-hud-muted">{t("ui.firstStepsDone")}</span>
        <Link href="/help" className="text-hud-gold hover:underline">
          {t("ui.help")}
        </Link>
      </HudPanel>
    );
  }

  const required = data.steps.filter((s) => !s.optional);

  const extra = data.steps.filter((s) => s.optional);

  return (
    <HudPanel>
      <HudSection
        title={t("ui.firstStepsTitle")}
        action={
          <div className="flex items-center gap-2">
            <span className="text-sm text-hud-muted">{`${data.requiredDone}/${data.requiredTotal}`}</span>
            <Button variant="ghost" size="sm" onClick={hide}>
              {t("ui.hide")}
            </Button>
          </div>
        }
      >
        <ol className="divide-y divide-hud-rule">
          {required.map((s) => (
            <StepRow key={s.id} step={s} role={data.role} />
          ))}
        </ol>
        {extra.length > 0 && (
          <>
            <p className="mt-3 text-xs uppercase tracking-wide text-hud-muted">{t("ui.moreFeatures")}</p>
            <ul className="divide-y divide-hud-rule">
              {extra.map((s) => (
                <StepRow key={s.id} step={s} role={data.role} />
              ))}
            </ul>
          </>
        )}
      </HudSection>
    </HudPanel>
  );
}
