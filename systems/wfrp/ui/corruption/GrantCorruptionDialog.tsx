"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { GrantSummaryView } from "./GrantSummaryView";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useGrantCorruption, useUndoCorruption } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { CORRUPTION_REASON_MAX, RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import type { CorruptionGrantResult } from "@/types/corruption";

export function GrantCorruptionDialog({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const t = useTranslations("wfrpCorruption.grant");

  const grant = useGrantCorruption(campaignId, characterId);

  const undo = useUndoCorruption(campaignId, characterId);

  const confirm = useConfirm();

  const [open, setOpen] = useState(false);

  const [points, setPoints] = useState("1");

  const [reason, setReason] = useState("");

  const [attempted, setAttempted] = useState(false);

  const [granted, setGranted] = useState(false);

  const result = granted ? (grant.data ?? null) : null;

  const [undone, setUndone] = useState(false);

  const max = RULE_SYSTEM_REGISTRY.wfrp.corruption?.grantMax ?? 1;

  const n = Number(points);

  const pointsValid = points.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= max;

  const valid = pointsValid && reason.trim() !== "";

  const close = (o: boolean) => {
    setOpen(o);

    if (!o) {
      setGranted(false);
      setUndone(false);
      setPoints("1");
      setReason("");
      setAttempted(false);
    }
  };

  const submit = () => {
    if (!valid) {
      setAttempted(true);

      return;
    }

    void grant.mutateOk({ points: n, reason: reason.trim() }).then((ok) => {
      if (ok) {
        setGranted(true);
        setUndone(false);
      }
    });
  };

  const revert = (r: CorruptionGrantResult) =>
    confirm({
      title: t("undo"),
      description: t("undoConfirm"),
      confirmLabel: t("undo"),
      onConfirm: async () => {
        if (await undo.mutateOk({ grantId: r.grantId })) setUndone(true);
      },
    });

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        {t("button")}
      </Button>
      <ResponsiveDialog
        hud
        open={open}
        onOpenChange={close}
        title={t("title")}
        footer={
          result ? (
            <Button type="button" variant="outline" disabled={undone || undo.isPending} onClick={() => revert(result)}>
              {undone ? t("undone") : t("undo")}
            </Button>
          ) : (
            <Button type="button" disabled={grant.isPending} onClick={submit}>
              {t("submit")}
            </Button>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            <h3 className="hud-sc text-sm text-hud-gold">{t("result")}</h3>
            <GrantSummaryView summary={result.summary} />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm">
              {t("points")}
              <Input className="mt-1 min-h-11" type="number" min={1} max={max} inputMode="numeric" aria-invalid={(attempted || points.trim() !== "") && !pointsValid} value={points} onChange={(e) => setPoints(e.target.value)} />
              <span className={attempted && !pointsValid ? "text-xs text-destructive" : "text-xs text-hud-muted"}>{t("pointsHint", { max })}</span>
            </label>
            <label className="block text-sm">
              {t("reason")}
              <Input className="mt-1 min-h-11" maxLength={CORRUPTION_REASON_MAX} aria-invalid={attempted && reason.trim() === ""} value={reason} onChange={(e) => setReason(e.target.value)} />
              {attempted && reason.trim() === "" && <span className="text-xs text-destructive">{t("reasonRequired")}</span>}
            </label>
          </div>
        )}
      </ResponsiveDialog>
    </>
  );
}
