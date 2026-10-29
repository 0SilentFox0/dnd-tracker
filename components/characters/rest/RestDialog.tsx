"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CharacterPickList } from "./CharacterPickList";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useRest } from "@/lib/hooks/characters";
import { useCheckedIds } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { CharacterListItem } from "@/types/characters";

const KINDS = ["short", "long"] as const;

interface RestDialogProps {
  campaignId: string;
  characters: CharacterListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RestDialog({ campaignId, characters, open, onOpenChange }: RestDialogProps) {
  const t = useTranslations("rest.restDialog");

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
      title={t("title")}
      description={t("description")}
      footer={
        <Button type="button" disabled={picked.size === 0 || rest.isPending} onClick={start}>
          {t("start")}
        </Button>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2">
        {KINDS.map((k) => (
          <Button key={k} type="button" variant="outline" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn(kind === k && "border-hud-gold-strong bg-hud-gold-strong/20")}>
            {t(k)}
          </Button>
        ))}
      </div>
      <CharacterPickList characters={characters} checked={checked} />
    </ResponsiveDialog>
  );
}
