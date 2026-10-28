"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { canReadiedAttack, useBattleSceneData, useReadiedAttack } from "@/lib/hooks/battle";
import type { BattleParticipant } from "@/types/battle";

const TARGET_BUTTON = "border border-white/15 px-2 py-1.5 text-left text-sm text-[var(--ink)] hover:border-[var(--gold)]/50 disabled:opacity-40";

function ReadiedAttackPicker({ participant }: { participant: BattleParticipant }) {
  const [open, setOpen] = useState(false);

  const { targets, attack, isPending } = useReadiedAttack(participant);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hud-sc mt-2 flex h-11 w-full items-center justify-center gap-2 border border-[var(--enemy)] bg-[var(--enemy)]/25 text-[15px] tracking-[.08em] text-[var(--ink)]">
        <Crosshair className="size-5 text-[var(--bone)]" />
        Підготовлена атака
      </button>
      <ResponsiveDialog open={open} onOpenChange={setOpen} size="sm" hud title="Підготовлена атака" description="Оберіть ціль" footer={<Button type="button" variant="outline" onClick={() => setOpen(false)}>Закрити</Button>}>
        <div className="grid gap-1">
          {targets.length === 0 && <div className="text-sm text-[var(--hud-muted)]">Немає цілей</div>}
          {targets.map((t) => (
            <button
              key={t.basicInfo.id}
              type="button"
              disabled={isPending}
              onClick={async () => {
                if (await attack(t.basicInfo.id)) setOpen(false);
              }}
              className={TARGET_BUTTON}
            >
              {t.basicInfo.name}
            </button>
          ))}
        </div>
      </ResponsiveDialog>
    </>
  );
}

export function ReadiedAttackButton({ participant }: { participant: BattleParticipant }) {
  const { battle } = useBattleSceneData();

  return canReadiedAttack(!!battle.rules?.actions.enabled, participant) ? <ReadiedAttackPicker participant={participant} /> : null;
}
