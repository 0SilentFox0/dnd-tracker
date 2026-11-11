"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { CareerStep } from "./CareerStep";
import { IdentityStep } from "./IdentityStep";
import { SpeciesStep } from "./SpeciesStep";
import { StatsStep } from "./StatsStep";
import { TalentsStep } from "./TalentsStep";

import { ActionBar } from "@/components/common/ActionBar";
import { StepIndicator } from "@/components/common/StepIndicator";
import { HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/utils/common/error-message";
import { useWfrpDraftForm,type WfrpDraftStepId } from "@/systems/wfrp/hooks";
import type { WfrpDraftIdentityInput } from "@/types/characters";

const STEP_ORDER: WfrpDraftStepId[] = ["species", "career", "stats", "talents", "identity"];

interface WfrpDraftFormProps {
  campaignId: string;
  characterId?: string;
  initialIdentity?: WfrpDraftIdentityInput;
}

export function WfrpDraftForm({ campaignId, characterId, initialIdentity }: WfrpDraftFormProps) {
  const t = useTranslations("wfrpCreation.wizard");

  const te = useTranslations("wfrpCreation.errors");

  const tc = useTranslations("common");

  const form = useWfrpDraftForm({ campaignId, characterId, initialIdentity });

  const { step, submit, reveal } = form;

  const last = step.index === step.total - 1;

  const rolling = reveal.rolling;

  const { skip } = reveal;

  useEffect(() => {
    if (!rolling) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [rolling, skip]);

  const issueTexts = submit.issueCodes.filter((code) => te.has(code as never)).map((code) => te(code as never));

  const ids = characterId ? (["identity"] as const) : STEP_ORDER;

  return (
    <HudFormPage title={characterId ? t("titleEdit") : t("title")} aside={t("aside")}>
      <div className="flex flex-1 flex-col px-4 pt-4">
        <div className="relative flex-1 pb-2">
          {!characterId && <StepIndicator label={t("stepOf", { current: step.index + 1, total: step.total })} steps={ids.map((id) => t(`steps.${id}`))} current={step.index} />}
          {rolling && (
            <button type="button" aria-label={t("skipHint")} className="absolute inset-0 z-20 cursor-pointer bg-transparent" onClick={skip}>
              <span className="sr-only">{t("skipHint")}</span>
            </button>
          )}
          {step.id !== "identity" && form.stepErrors(step.id).length > 0 && (
            <ul role="alert" className="mt-4 list-disc pl-5 text-sm text-destructive">
              {form.stepErrors(step.id).map((code) => (
                <li key={code}>{te(code as never)}</li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            {step.id === "species" && <SpeciesStep form={form} />}
            {step.id === "career" && <CareerStep form={form} />}
            {step.id === "stats" && <StatsStep form={form} />}
            {step.id === "talents" && <TalentsStep form={form} />}
            {step.id === "identity" && <IdentityStep form={form} />}
          </div>
        </div>
        <ActionBar error={submit.error ? (issueTexts.length ? issueTexts.join(" · ") : errorMessage(submit.error, t("failed"))) : null} className="mt-4 sm:sticky sm:bottom-0 sm:border-t sm:bg-background/[.97] sm:pt-3">
          {characterId || step.index === 0 ? (
            <Button type="button" variant="outline" className="min-h-11" asChild>
              <Link href={`/campaigns/${campaignId}/character`}>{tc("actions.cancel")}</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" className="min-h-11" onClick={step.back} disabled={rolling}>
              {t("back")}
            </Button>
          )}
          {last ? (
            <Button type="button" className="min-h-11" onClick={submit.run} disabled={!submit.canRun || submit.isPending || rolling}>
              {submit.isPending ? t("submitting") : characterId ? t("submitEdit") : t("submit")}
            </Button>
          ) : (
            !step.hideNext && <Button type="button" className="min-h-11" onClick={step.next} disabled={!step.canNext || rolling}>
              {t("next")}
            </Button>
          )}
        </ActionBar>
      </div>
    </HudFormPage>
  );
}
