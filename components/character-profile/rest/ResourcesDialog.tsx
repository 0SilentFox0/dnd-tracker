"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { systemUiOf } from "@/components/systems";
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
  const { campaignId, characterId, sheet } = useProfile();

  const t = useTranslations("rest.resources");

  const tc = useTranslations("common.actions");

  const edit = useEditResources(campaignId, characterId);

  const confirm = useConfirm();

  const [hp, setHp] = useState(String(rest.hp?.current ?? ""));

  const Ui = systemUiOf(sheet.system);

  const [extra, setExtra] = useState(() => Ui.resourceDefaults?.(sheet) ?? {});

  const itemCharges = rest.charges.filter((c) => c.key.startsWith(ITEM_POOL_PREFIX) || c.key.startsWith(GRANT_POOL_PREFIX));

  const [spent, setSpent] = useState<Record<string, string>>(() => Object.fromEntries(itemCharges.map((c) => [c.key, String(c.used)])));

  const changedCharges = Object.fromEntries(itemCharges.flatMap((c) => (spent[c.key] !== undefined && spent[c.key].trim() !== "" && Number(spent[c.key]) !== c.used ? [[c.key, Number(spent[c.key])]] : [])));

  const send = (body: ResourcesEditBody) => void edit.mutateOk(body).then((ok) => ok && onOpenChange(false));

  const filled = [hp, ...Object.values(extra)].every((v) => v.trim() !== "");

  const save = () => filled && send({ hp: Number(hp), ...Object.fromEntries(Object.entries(extra).map(([key, value]) => [key, Number(value)])), ...(Object.keys(changedCharges).length > 0 && { charges: changedCharges }) });

  const toggleDead = async () => {
    if (rest.dead || (await confirm({ title: t("deadConfirmTitle"), confirmLabel: t("deadConfirm"), destructive: true }))) send({ dead: !rest.dead });
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      footer={
        <>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => send({ reset: true })}>
            {t("restore")}
          </Button>
          <Button type="button" variant="outline" disabled={edit.isPending} onClick={() => void toggleDead()}>
            {rest.dead ? t("revive") : t("markDead")}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={edit.isPending || !filled}>
            {tc("save")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid grid-cols-3 gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div>
          <Label htmlFor="res-hp">{t("hp", { max: rest.hp?.max ?? "—" })}</Label>
          <Input id="res-hp" type="number" min={0} value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>
        {Ui.ResourceFields && <Ui.ResourceFields sheet={sheet} values={extra} onChange={(key, value) => setExtra((prev) => ({ ...prev, [key]: value }))} />}
        {itemCharges.map((c) => (
          <div key={c.key} className="col-span-3 grid grid-cols-[1fr_6rem] items-center gap-2">
            <Label htmlFor={`res-charge-${c.key}`}>{t("charge", { name: c.name, uses: c.uses })}</Label>
            <Input id={`res-charge-${c.key}`} aria-label={t("chargeSpent", { name: c.name })} type="number" min={0} max={c.uses} value={spent[c.key] ?? ""} onChange={(e) => setSpent((s) => ({ ...s, [c.key]: e.target.value }))} />
          </div>
        ))}
      </form>
    </ResponsiveDialog>
  );
}
