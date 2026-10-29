"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useAssistantPolicy } from "@/lib/hooks/ai/useAssistantPolicy";
import type { ExecutionMode } from "@/types/assistant";

export function AssistantPolicyControl({ campaignId, target, id, executionMode = "review" }: { campaignId: string; target: "thread" | "token"; id: string; executionMode?: ExecutionMode }) {
  const t = useTranslations("ai");

  const [open, setOpen] = useState(false);

  const policy = useAssistantPolicy(campaignId);

  const mode = executionMode;

  const change = async (next: ExecutionMode) => {
    try { await policy.mutateAsync({ target, id, executionMode: next }); setOpen(false); }
    catch { /* The error is shown without trusting a raw server payload. */ }
  };

  return <section aria-label={t("policy.ariaLabel")} className="space-y-2 text-sm">
    <p>{t("policy.mode", { mode: t(`policy.modes.${mode === "auto" ? "auto" : "review"}`) })}</p>
    <p className="text-xs">{t("policy.note")}</p>
    <Button variant="outline" disabled={policy.isPending} onClick={() => mode === "auto" ? void change("review") : setOpen(true)}>{mode === "auto" ? t("policy.backToReview") : t("policy.enableAuto")}</Button>
    {policy.isSuccess && policy.data.executionMode !== mode && <p role="status">{t("policy.accepted")}</p>}
    {policy.isError && <p role="alert">{t("policy.failed")}</p>}
    <ResponsiveDialog open={open} onOpenChange={setOpen} title={t("policy.dialog.title")} description={t("policy.dialog.description")} footer={<Button disabled={policy.isPending} onClick={() => void change("auto")}>{t("policy.dialog.confirm")}</Button>}>
      <p>{t("policy.dialog.body", { target })}</p>
    </ResponsiveDialog>
  </section>;
}
