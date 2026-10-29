"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { OptionButton } from "@/components/hud/OptionButton";
import { TargetRadioList } from "@/components/hud/TargetRadioList";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCoreActions } from "@/lib/hooks/battle";
import { useText } from "@/lib/i18n/use-text";
import type { CoreActionKey } from "@/lib/utils/battle/actions/registry";
import type { BattleParticipant } from "@/types/battle";

const SHOVE_MODES = ["prone", "push"] as const;

interface CoreActionsDialogProps {
  participant: BattleParticipant;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function CoreActionsDialog({ open, ...rest }: CoreActionsDialogProps) {
  return open ? <CoreActionsBody {...rest} /> : null;
}

function CoreActionsBody({ participant, onOpenChange, onDone }: Omit<CoreActionsDialogProps, "open">) {
  const t = useTranslations("battle.coreActions");

  const tCost = useTranslations("spells.costs");

  const tCommon = useTranslations("common.ui");

  const tActions = useTranslations("battleCommon.coreActions");

  const text = useText();

  const { items, targetsFor, run, isPending } = useCoreActions(participant, onDone);

  const [key, setKey] = useState<CoreActionKey | null>(null);

  const [targetId, setTargetId] = useState<string | null>(null);

  const [mode, setMode] = useState<"prone" | "push">("prone");

  const current = items.find((i) => i.key === key);

  const needsTarget = !!current && current.def.target !== "none";

  const targets = key && needsTarget ? targetsFor(key) : [];

  const ready = !!current && !isPending && (!needsTarget || targetId !== null);

  const choose = (k: CoreActionKey) => {
    setKey(k);
    setTargetId(null);
  };

  const submit = async () => {
    if (!key) return;

    if (await run({ key, targetId: targetId ?? undefined, mode })) onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open
      onOpenChange={onOpenChange}
      size="md"
      hud
      title={t("title")}
      description={t("description")}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tCommon("close")}</Button>
          <Button type="button" disabled={!ready} onClick={() => void submit()}>{t("run")}</Button>
        </>
      }
    >
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2" role="radiogroup" aria-label={t("action")}>
        {items.map(({ key: k, cost, ok, reason }) => (
          <OptionButton key={k} role="radio" checked={key === k} disabled={!ok} title={tActions(k)} meta={cost === "movement" ? t("movement") : tCost(cost)} note={<>{t(`descriptions.${k}`)}{!ok && <span className="block text-hud-danger">{reason && text(reason)}</span>}</>} onClick={() => choose(k)} />
        ))}
      </div>
      {key === "shove" && (
        <div className="grid grid-cols-2 gap-1" role="radiogroup" aria-label={t("shoveMode")}>
          {SHOVE_MODES.map((m) => (
            <OptionButton key={m} role="radio" checked={mode === m} title={t(`shove.${m}`)} onClick={() => setMode(m)} />
          ))}
        </div>
      )}
      {needsTarget && <TargetRadioList targets={targets} value={targetId} onChange={setTargetId} />}
    </div>
    </ResponsiveDialog>
  );
}
