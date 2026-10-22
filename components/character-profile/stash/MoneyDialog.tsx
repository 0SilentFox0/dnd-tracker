"use client";

import { type FormEvent, useState } from "react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { type Coin, COIN_LABEL, COINS } from "@/lib/constants/inventory";
import { useStashAction } from "@/lib/hooks/characters";
import { useNotify } from "@/lib/hooks/common";
import type { Purse } from "@/types/inventory";

export type MoneyMode = "spend" | "gain" | "set";

const TITLE: Record<MoneyMode, string> = { spend: "Витратити", gain: "Отримати", set: "Задати суму" };

const FORM_ID = "money-form";

interface MoneyDialogProps {
  mode: MoneyMode;
  purse: Purse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoneyDialog({ mode, purse, open, onOpenChange }: MoneyDialogProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const notify = useNotify();

  const [amount, setAmount] = useState("1");

  const [coin, setCoin] = useState<Coin>("gp");

  const [note, setNote] = useState("");

  const [set, setSet] = useState<Record<Coin, string>>({ gp: String(purse.gp), sp: String(purse.sp), cp: String(purse.cp) });

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    const n = Math.floor(Number(amount));

    try {
      if (mode === "set") await action.mutateAsync({ action: "setMoney", gp: Math.max(0, Math.floor(Number(set.gp))), sp: Math.max(0, Math.floor(Number(set.sp))), cp: Math.max(0, Math.floor(Number(set.cp))) });
      else if (mode === "spend") await action.mutateAsync({ action: "spend", amount: n, coin, note: note.trim() });
      else await action.mutateAsync({ action: "gain", amount: n, coin, ...(note.trim() && { note: note.trim() }) });

      onOpenChange(false);
    } catch (err) {
      notify((err as Error).message || "Не вдалося виконати дію");
    }
  };

  const invalid = mode === "set" ? COINS.some((c) => !(Number(set[c]) >= 0)) : !(Number(amount) >= 1) || (mode === "spend" && !note.trim());

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={TITLE[mode]}
      footer={
        <Button type="submit" form={FORM_ID} disabled={action.isPending || invalid}>
          Підтвердити
        </Button>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void submit(e)} className="space-y-3">
        {mode === "set" ? (
          <div className="grid grid-cols-3 gap-2">
            {COINS.map((c) => (
              <Input key={c} type="number" min={0} step={1} inputMode="numeric" aria-label={COIN_LABEL[c]} value={set[c]} onChange={(e) => setSet({ ...set, [c]: e.target.value })} className="h-11" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input type="number" min={1} step={1} inputMode="numeric" aria-label="Сума" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 min-w-0 flex-1" autoFocus />
              <select aria-label="Монета" value={coin} onChange={(e) => setCoin(e.target.value as Coin)} className="h-11 rounded-md border border-hud-line bg-hud-field px-2 text-hud-ink">
                {COINS.map((c) => (
                  <option key={c} value={c}>{COIN_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <Input aria-label="На що" placeholder={mode === "spend" ? "На що" : "Звідки (необов'язково)"} required={mode === "spend"} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
          </>
        )}
      </form>
    </ResponsiveDialog>
  );
}
