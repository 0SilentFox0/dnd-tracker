"use client";

import { useTranslations } from "next-intl";
import { Eye, EyeOff, Minus, Plus } from "lucide-react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Button } from "@/components/ui/button";
import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";

interface SetupParticipantRowProps {
  name: string;
  avatar: string | null;
  quantity?: number;
  side: ParticipantSide;
  reserved: number;
  actions: { onMoveToOtherSide: () => void; onRemove: () => void; onReserveChange: (reserved: number) => void };
}

export function SetupParticipantRow({
  name,
  avatar,
  quantity,
  side,
  reserved,
  actions,
}: SetupParticipantRowProps) {
  const t = useTranslations("battleSetup.participant");

  const isAlly = side === ParticipantSide.ALLY;

  const bgClass = isAlly
    ? "bg-green-50 dark:bg-green-950/20"
    : "bg-red-50 dark:bg-red-950/20";

  return (
    <div className={cn("flex items-center justify-between gap-2 p-3 border rounded-lg", bgClass, reserved > 0 && "opacity-60")}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <EntityIcon src={avatar} name={name} alt={name} size={36} className="size-9 rounded" fallback={<span>{side === ParticipantSide.ALLY ? "👤" : "⚔️"}</span>} />
        <span className="text-sm font-medium truncate">{name}</span>
        {quantity != null && quantity > 1 && (
          <span className="text-xs text-muted-foreground shrink-0">
            ×{quantity}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {reserved > 0 && (quantity ?? 1) > 1 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Button type="button" variant="ghost" size="sm" aria-label={t("reserveLess")} onClick={() => actions.onReserveChange(reserved - 1)}>
              <Minus className="size-3" />
            </Button>
            {t("reserved", { count: reserved })}
            <Button type="button" variant="ghost" size="sm" aria-label={t("reserveMore")} onClick={() => actions.onReserveChange(reserved + 1)}>
              <Plus className="size-3" />
            </Button>
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={reserved > 0}
          title={reserved > 0 ? t("unreserve") : t("reserve")}
          onClick={() => actions.onReserveChange(reserved > 0 ? 0 : (quantity ?? 1))}
        >
          {reserved > 0 ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={actions.onMoveToOtherSide}
          title={isAlly ? t("moveToEnemies") : t("moveToAllies")}
        >
          {isAlly ? "→" : "←"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={actions.onRemove}
          title={t("remove")}
          className="text-muted-foreground hover:text-destructive"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
