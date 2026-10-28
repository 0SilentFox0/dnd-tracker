"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useEditResources } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import { GRANT_POOL_PREFIX, ITEM_POOL_PREFIX } from "@/lib/utils/items/pools";
import type { ResourcesEditBody, SheetRest } from "@/types/characters";

const FORM_ID = "resources-edit-form";

export function ResourcesDialog({ rest, open, onOpenChange }: { rest: SheetRest; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { campaignId, characterId } = useProfile();

  const edit = useEditResources(campaignId, characterId);

  const confirm = useConfirm();

  const [hp, setHp] = useState(String(rest.hp?.current ?? ""));

  const [temp, setTemp] = useState(String(rest.hp?.temp ?? 0));

  const [exhaustion, setExhaustion] = useState(String(rest.exhaustion ?? 0));

  const itemCharges = rest.charges.filter((c) => c.key.startsWith(ITEM_POOL_PREFIX) || c.key.startsWith(GRANT_POOL_PREFIX));

  const [spent, setSpent] = useState<Record<string, string>>(() => Object.fromEntries(itemCharges.map((c) => [c.key, String(c.used)])));

  const changedCharges = Object.fromEntries(itemCharges.flatMap((c) => (spent[c.key] !== undefined && spent[c.key].trim() !== "" && Number(spent[c.key]) !== c.used ? [[c.key, Number(spent[c.key])]] : [])));

  const send = (body: ResourcesEditBody) => void edit.mutateOk(body).then((ok) => ok && onOpenChange(false));

  const filled = [hp, temp, exhaustion].every((v) => v.trim() !== "");

  const save = () => filled && send({ hp: Number(hp), tempHp: Number(temp), exhaustion: Number(exhaustion), ...(Object.keys(changedCharges).length > 0 && { charges: changedCharges }) });

  const toggleDead = async () => {
    if (rest.dead || (await confirm({ title: "Позначити героя загиблим?", confirmLabel: "Позначити", destructive: true }))) send({ dead: !rest.dead });
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Ресурси героя"
      footer={
        <>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => send({ reset: true })}>
            Повністю відновити
          </Button>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => void toggleDead()}>
            {rest.dead ? "Воскресити" : "Позначити загиблим"}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={edit.isPending || !filled}>
            Зберегти
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid grid-cols-3 gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div>
          <Label htmlFor="res-hp">HP (макс. {rest.hp?.max ?? "—"})</Label>
          <Input id="res-hp" type="number" min={0} value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="res-temp">Тимч. HP</Label>
          <Input id="res-temp" type="number" min={0} value={temp} onChange={(e) => setTemp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="res-exh">Виснаження</Label>
          <Input id="res-exh" type="number" min={0} max={6} value={exhaustion} onChange={(e) => setExhaustion(e.target.value)} />
        </div>
        {itemCharges.map((c) => (
          <div key={c.key} className="col-span-3 grid grid-cols-[1fr_6rem] items-center gap-2">
            <Label htmlFor={`res-charge-${c.key}`}>{c.name} (з {c.uses})</Label>
            <Input id={`res-charge-${c.key}`} aria-label={`${c.name}: витрачено`} type="number" min={0} max={c.uses} value={spent[c.key] ?? ""} onChange={(e) => setSpent((s) => ({ ...s, [c.key]: e.target.value }))} />
          </div>
        ))}
      </form>
    </ResponsiveDialog>
  );
}
