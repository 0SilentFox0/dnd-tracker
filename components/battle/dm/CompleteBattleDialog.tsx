"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleScene } from "@/lib/hooks/battle";

export function CompleteBattleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("battleDm.complete");

  const tActions = useTranslations("common.actions");

  const { actions } = useBattleScene();

  const finish = (result?: "victory" | "defeat") => {
    actions.complete.mutate(result ? { result } : {}, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      size="sm"
      hud
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button variant="outline" disabled={actions.complete.isPending} className="border-hud-danger/50 text-hud-danger hover:bg-hud-danger/15" onClick={() => finish("defeat")}>
            {t("defeat")}
          </Button>
          <Button variant="outline" disabled={actions.complete.isPending} className="border-[var(--gold)]/50 text-[var(--gold)] hover:bg-[var(--gold)]/10" onClick={() => finish()}>
            {t("auto")}
          </Button>
          <Button disabled={actions.complete.isPending} onClick={() => finish("victory")}>
            {t("victory")}
          </Button>
        </>
      }
    />
  );
}
