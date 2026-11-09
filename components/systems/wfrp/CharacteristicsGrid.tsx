"use client";

import { useTranslations } from "next-intl";

import type { SheetRollRequest } from "../types";

import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/common/format";
import type { SheetWfrpBlock } from "@/lib/utils/rules/systems";

interface Props {
  block: SheetWfrpBlock;
  onRoll: (request: SheetRollRequest) => void;
  canRoll: boolean;
}

export function CharacteristicsGrid({ block, onRoll, canRoll }: Props) {
  const tg = useTranslations("gameTerms.characteristics");

  const t = useTranslations("characterProfile.combat");

  return (
    <div className="grid grid-cols-5 gap-1">
      {block.characteristics.map((c) => {
        const body = (
          <>
            <small className="block text-[10px] text-hud-muted">{tg(`${c.key}.short`)}</small>
            <b className="block text-[17px] leading-5">{c.value}</b>
            {c.mod !== 0 && <small className="block text-[10px] tabular-nums text-hud-muted">{signed(c.mod)}</small>}
            <span className="block text-[15px] font-semibold leading-5 tabular-nums text-hud-muted">{c.bonus}</span>
          </>
        );

        return canRoll ? (
          <button
            key={c.key}
            type="button"
            title={t("roll")}
            aria-label={`${t("roll")}: ${tg(`${c.key}.label`)}`}
            onClick={() => onRoll({ label: tg(`${c.key}.label`), subject: { kind: "test", characteristic: c.key } })}
            className={cn("min-w-0 rounded-lg border border-hud-line bg-hud-field py-1 text-center")}
          >
            {body}
          </button>
        ) : (
          <div key={c.key} className="min-w-0 rounded-lg border border-hud-line bg-hud-field py-1 text-center">
            {body}
          </div>
        );
      })}
    </div>
  );
}
