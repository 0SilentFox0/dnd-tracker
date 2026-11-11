"use client";

import { useTranslations } from "next-intl";

import { skillLabel } from "./skill-label";

import type { SheetRollRequest } from "@/components/systems/types";
import { cn } from "@/lib/utils";
import type { SheetWfrpBlock } from "@/systems/wfrp/rules/characteristics/sheet-block";

interface Props {
  block: SheetWfrpBlock;
  onRoll: (request: SheetRollRequest) => void;
  canRoll: boolean;
}

export function SkillsList({ block, onRoll, canRoll }: Props) {
  const tg = useTranslations("gameTerms");

  const t = useTranslations("characterProfile.combat");

  return (
    <ul className="grid grid-cols-1 gap-x-4 text-sm sm:grid-cols-2">
      {block.skills.map((s) => {
        const label = skillLabel(tg, s.key, s.spec);

        const rollable = canRoll && s.trained;

        return (
          <li key={`${s.key}:${s.spec ?? ""}`} className={cn("border-b border-hud-raised py-1", !s.trained && "text-hud-muted")}>
            <button
              type="button"
              disabled={!rollable}
              title={s.trained ? t("roll") : t("untrained")}
              onClick={() => onRoll({ label, subject: { kind: "test", skill: s.key, ...(s.spec && { spec: s.spec }) } })}
              className="flex w-full justify-between gap-2 text-left disabled:cursor-default"
            >
              <span className="min-w-0 truncate">
                {label}
                <span className="ml-1 text-xs text-hud-muted">{tg(`characteristics.${s.characteristic}.short`)}{s.advances > 0 && ` +${s.advances}`}</span>
              </span>
              <span className="tabular-nums">{s.target}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
