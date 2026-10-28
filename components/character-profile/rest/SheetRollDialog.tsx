"use client";

import { useRef, useState } from "react";

import { useProfile } from "../ProfileContext";

import "@/components/battle/fx/fx.css";
import { DiceStage, type DiceStageHandle } from "@/components/battle/fx/dice/DiceStage";
import { FormAlert } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SwitchField } from "@/components/ui/switch-field";
import { useSheetRoll } from "@/lib/hooks/characters";
import { cryptoRandom } from "@/lib/utils/common/dice";
import { signed } from "@/lib/utils/common/format";
import type { SheetRollResult, SheetRollSubject } from "@/types/characters";

export interface SheetRollRequest {
  label: string;
  subject: SheetRollSubject;
}

const MODE_TEXT = { advantage: "з перевагою", disadvantage: "з перешкодою", normal: "" } as const;

export function SheetRollDialog({ request, onClose }: { request: SheetRollRequest | null; onClose: () => void }) {
  const { campaignId, characterId, sheet } = useProfile();

  const roll = useSheetRoll(campaignId, characterId);

  const stage = useRef<DiceStageHandle>(null);

  const [useInspiration, setUseInspiration] = useState(false);

  const [result, setResult] = useState<SheetRollResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setResult(null);
    setError(null);
    setUseInspiration(false);
    onClose();
  };

  const throwDice = async () => {
    if (!request) return;

    setError(null);

    try {
      const r = await roll.mutateAsync({ ...request.subject, ...(useInspiration && { useInspiration: true }) });

      setResult(r);
      setUseInspiration(false);
      void stage.current?.play({ seed: Math.floor(cryptoRandom() * 2 ** 31), groups: [r.rolls.map((value) => ({ sides: 20 as const, value }))] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося кинути");
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={!!request}
      onOpenChange={(o) => !o && close()}
      title={request?.label ?? ""}
      footer={
        <Button type="button" disabled={roll.isPending} onClick={() => void throwDice()}>
          Кинути
        </Button>
      }
    >
      {sheet.rest?.inspiration && !result && (
        <SwitchField id="sheet-roll-inspiration" ariaLabel="Натхнення" label="✦ Натхнення — перевага, натхнення буде витрачено" checked={useInspiration} onCheckedChange={setUseInspiration} />
      )}
      {result && (
        <div aria-live="polite" className="text-center">
          <div className="text-4xl font-bold tabular-nums text-hud-gold-bright">{result.autoFail ? "✕" : result.total}</div>
          <div className="text-xs text-hud-muted">
            {result.autoFail ? "Автопровал" : `d20 ${result.rolls.join(" / ")} ${MODE_TEXT[result.mode]} · ${signed(result.mod + result.bonus)}`}
          </div>
        </div>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <DiceStage ref={stage} />
    </ResponsiveDialog>
  );
}
