"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useEditResources } from "@/lib/hooks/characters";
import { useConfirm } from "@/lib/hooks/common";
import type { ResourcesEditBody, SheetRest } from "@/types/characters";

const FORM_ID = "resources-edit-form";

export function ResourcesDialog({ rest, open, onOpenChange }: { rest: SheetRest; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { campaignId, characterId } = useProfile();

  const edit = useEditResources(campaignId, characterId);

  const confirm = useConfirm();

  const [hp, setHp] = useState(String(rest.hp?.current ?? ""));

  const [temp, setTemp] = useState(String(rest.hp?.temp ?? 0));

  const [exhaustion, setExhaustion] = useState(String(rest.exhaustion ?? 0));

  const send = (body: ResourcesEditBody) => void edit.mutateOk(body).then((ok) => ok && onOpenChange(false));

  const filled = [hp, temp, exhaustion].every((v) => v.trim() !== "");

  const save = () => filled && send({ hp: Number(hp), tempHp: Number(temp), exhaustion: Number(exhaustion) });

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
      </form>
    </ResponsiveDialog>
  );
}
