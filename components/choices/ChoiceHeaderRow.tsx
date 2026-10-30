"use client";

import { Trash2 } from "lucide-react";

import { HUD_SELECT_CLASS } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { Choice, ChoiceKind, ChoiceOwner } from "@/types/choices";

interface ChoiceHeaderRowProps {
  index: number;
  choice: Choice;
  owner: ChoiceOwner;
  kinds: readonly ChoiceKind[];
  actions: { onPatch: (patch: Partial<Choice>) => void; onSwitchKind: (kind: ChoiceKind) => void; onRemove: () => void };
}

export function ChoiceHeaderRow({ index, choice, owner, kinds, actions }: ChoiceHeaderRowProps) {
  const t = useTranslator("choices");

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-40 flex-1 space-y-1">
        <Label htmlFor={`choice-${index}-label`}>{t("header.name")}</Label>
        <Input id={`choice-${index}-label`} value={choice.label} onChange={(e) => actions.onPatch({ label: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`choice-${index}-kind`}>{t("header.kind")}</Label>
        <select id={`choice-${index}-kind`} className={HUD_SELECT_CLASS} value={choice.kind} onChange={(e) => actions.onSwitchKind(e.target.value as ChoiceKind)}>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </select>
        <p className="max-w-56 text-xs text-hud-muted">{t(`kindHints.${choice.kind}`)}</p>
      </div>
      {owner !== "feat" && (
        <div className="w-24 space-y-1">
          <Label htmlFor={`choice-${index}-level`}>{t("header.level")}</Label>
          <Input id={`choice-${index}-level`} type="number" min={1} max={MAX_CLASS_LEVEL} value={choice.level} onChange={(e) => actions.onPatch({ level: Number(e.target.value) || 1 })} />
        </div>
      )}
      <Button type="button" variant="ghost" size="sm" aria-label={t("header.remove", { label: choice.label })} onClick={actions.onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
