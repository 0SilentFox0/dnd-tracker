"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { TOKEN_COLORS, TOKEN_LABEL_MAX } from "@/lib/constants/characters";
import type { CreateTokenInput } from "@/lib/schemas/character-tokens";
import { cn } from "@/lib/utils";
import type { TokenColor } from "@/types/characters";

export const TOKEN_COLOR_LABEL: Record<TokenColor, string> = { red: "Червоний", green: "Зелений" };

export const TOKEN_DOT: Record<TokenColor, string> = { red: "bg-red-600", green: "bg-emerald-600" };

interface AddTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateTokenInput) => Promise<boolean>;
  isPending: boolean;
}

export function AddTokenDialog({ open, onOpenChange, onSubmit, isPending }: AddTokenDialogProps) {
  const [color, setColor] = useState<TokenColor>("green");

  const [label, setLabel] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    if (!label.trim()) return;

    if (await onSubmit({ color, label: label.trim() })) {
      setLabel("");
      onOpenChange(false);
    }
  };

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Видати жетон"
      footer={
        <Button type="submit" form="add-token-form" disabled={isPending || !label.trim()}>
          Видати
        </Button>
      }
    >
      <form id="add-token-form" onSubmit={(e) => void submit(e)} className="space-y-3">
        <div className="flex gap-2" role="group" aria-label="Колір жетона">
          {TOKEN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className={cn("flex h-11 flex-1 items-center justify-center gap-2 rounded border border-[#2a2218] text-sm", color === c && "border-hud-gold text-hud-gold")}
            >
              <span className={cn("size-3 rounded-full", TOKEN_DOT[c])} />
              {TOKEN_COLOR_LABEL[c]}
            </button>
          ))}
        </div>
        <Input aria-label="Підпис жетона" maxLength={TOKEN_LABEL_MAX} value={label} onChange={(e) => setLabel(e.target.value)} className="h-11" autoFocus />
      </form>
    </ResponsiveDialog>
  );
}
