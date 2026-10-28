"use client";

import { useState } from "react";

import { CharacterPickList, useCheckedIds } from "./CharacterPickList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { useAwardXp } from "@/lib/hooks/characters";
import type { CharacterListItem } from "@/types/characters";

interface ExperienceDialogProps {
  campaignId: string;
  characters: CharacterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExperienceDialog({ campaignId, characters, open, onOpenChange }: ExperienceDialogProps) {
  const award = useAwardXp(campaignId);

  const checked = useCheckedIds(characters);

  const { picked } = checked;

  const [amount, setAmount] = useState("");

  const [split, setSplit] = useState(true);

  const [note, setNote] = useState("");

  const value = Number.parseInt(amount, 10);

  const valid = Number.isFinite(value) && value !== 0 && picked.size > 0;

  const submit = () =>
    void award.mutateOk({ characterIds: [...picked], amount: value, split, ...(note.trim() && { note: note.trim() }) }).then((ok) => ok && onOpenChange(false));

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Досвід"
      footer={
        <Button type="button" disabled={!valid || award.isPending} onClick={submit}>
          Нарахувати
        </Button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="xp-amount">Сума (від’ємна — виправлення)</Label>
          <Input id="xp-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="xp-split" checked={split} onCheckedChange={setSplit} />
          <Label htmlFor="xp-split">Поділити між обраними</Label>
        </div>
        <div>
          <Label htmlFor="xp-note">Примітка</Label>
          <Input id="xp-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <CharacterPickList characters={characters} checked={checked} suffix={(c) => ` · ${c.experience ?? 0}`} />
      </div>
    </ResponsiveDialog>
  );
}
