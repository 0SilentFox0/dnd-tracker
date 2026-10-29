"use client";

import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { BattleStatus } from "@/lib/constants/battle";
import { useBattleBriefs } from "@/lib/hooks/battles";
import { useTranslator } from "@/lib/i18n/use-translator";

export function BattlePickerDialog({ campaignId, open, onOpenChange, onPick }: { campaignId: string; open: boolean; onOpenChange(open: boolean): void; onPick(battleId: string): void }) {
  const t = useTranslations("scenario.battlePicker");

  const tAll = useTranslator();

  const { data: briefs = [], isLoading } = useBattleBriefs(campaignId, { enabled: open });

  const sorted = [...briefs].sort((a, b) => Number(a.status === BattleStatus.COMPLETED) - Number(b.status === BattleStatus.COMPLETED));

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("title")}>
      {isLoading ? (
        <LoadingState />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Swords} title={t("empty")} />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((b) => (
            <Button
              key={b.id}
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                onPick(b.id);
                onOpenChange(false);
              }}
            >
              {b.name} · {tAll.has(`dashboard.battleStatus.${b.status}`) ? tAll(`dashboard.battleStatus.${b.status}`) : b.status}
            </Button>
          ))}
        </div>
      )}
    </ResponsiveDialog>
  );
}
