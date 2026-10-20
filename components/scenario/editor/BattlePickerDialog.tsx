"use client";

import { Swords } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useBattleBriefs } from "@/lib/hooks/battles";

const STATUS_LABEL: Record<string, string> = { prepared: "підготовлений", active: "йде", completed: "завершений" };

export function BattlePickerDialog({ campaignId, open, onOpenChange, onPick }: { campaignId: string; open: boolean; onOpenChange(open: boolean): void; onPick(battleId: string): void }) {
  const { data: briefs = [] } = useBattleBriefs(campaignId, { enabled: open });

  const sorted = [...briefs].sort((a, b) => Number(a.status === "completed") - Number(b.status === "completed"));

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title="Бій для абзацу">
      {sorted.length === 0 ? (
        <EmptyState icon={Swords} title="Немає боїв" />
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
              {b.name} · {STATUS_LABEL[b.status] ?? b.status}
            </Button>
          ))}
        </div>
      )}
    </ResponsiveDialog>
  );
}
