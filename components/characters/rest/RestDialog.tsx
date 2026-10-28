"use client";

import { useState } from "react";

import { CharacterPickList } from "./CharacterPickList";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useRest } from "@/lib/hooks/characters";
import { useCheckedIds } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { CharacterListItem } from "@/types/characters";

const KINDS = [["short", "Короткий"], ["long", "Довгий"]] as const;

interface RestDialogProps {
  campaignId: string;
  characters: CharacterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestDialog({ campaignId, characters, open, onOpenChange }: RestDialogProps) {
  const rest = useRest(campaignId);

  const [kind, setKind] = useState<"short" | "long">("short");

  const checked = useCheckedIds(characters);

  const { picked } = checked;

  const start = () => void rest.mutateOk({ kind, characterIds: [...picked] }).then((ok) => ok && onOpenChange(false));

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Відпочинок"
      description="Короткий: слоти пакту, заряди «до короткого відпочинку», вікно кісток хітів. Довгий: усе, половина кісток хітів, виснаження −1. Мертві пропускаються."
      footer={
        <Button type="button" disabled={picked.size === 0 || rest.isPending} onClick={start}>
          Почати відпочинок
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {KINDS.map(([k, label]) => (
          <Button key={k} type="button" variant="outline" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn(kind === k && "border-hud-gold-strong bg-hud-gold-strong/20")}>
            {label}
          </Button>
        ))}
      </div>
      <CharacterPickList characters={characters} checked={checked} />
    </ResponsiveDialog>
  );
}
