"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { ParticipantSide } from "@/lib/constants/battle";
import { useBattleScene } from "@/lib/hooks/battle";

export function AwaitingDmDialog() {
  const { awaiting, reserve, actions, isDM } = useBattleScene();

  const [dismissedFor, setDismissedFor] = useState<typeof awaiting>(null);

  if (!awaiting && dismissedFor) setDismissedFor(null);

  if (!isDM || !awaiting || dismissedFor === awaiting) return null;

  const side = awaiting === "victory" ? ParticipantSide.ENEMY : ParticipantSide.ALLY;

  const waiting = reserve.filter((p) => p.basicInfo.side === side);

  const busy = actions.reveal.isPending || actions.complete.isPending;

  return (
    <ResponsiveDialog
      open
      onOpenChange={() => setDismissedFor(awaiting)}
      size="sm"
      hud
      title={awaiting === "victory" ? "У резерві ще є вороги" : "У резерві ще є союзники"}
      description={`${awaiting === "victory" ? "Видимих ворогів переможено" : "Видимих союзників переможено"}. Ввести резерв у бій чи завершити бій?`}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={() => actions.complete.mutate({ result: awaiting })}>Завершити бій</Button>
          <Button disabled={busy} onClick={() => actions.reveal.mutate({ participantIds: waiting.map((p) => p.basicInfo.id) })}>Ввести всіх</Button>
        </>
      }
    >
      <ul className="space-y-1 py-2 text-sm">
        {waiting.map((p) => <li key={p.basicInfo.id}>{p.basicInfo.name}</li>)}
      </ul>
    </ResponsiveDialog>
  );
}
