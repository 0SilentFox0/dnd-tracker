"use client";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Button } from "@/components/ui/button";
import { ParticipantSide } from "@/lib/constants/battle";

interface SetupParticipantRowProps {
  name: string;
  avatar: string | null;
  quantity?: number;
  side: ParticipantSide;
  onMoveToOtherSide: () => void;
  onRemove: () => void;
}

export function SetupParticipantRow({
  name,
  avatar,
  quantity,
  side,
  onMoveToOtherSide,
  onRemove,
}: SetupParticipantRowProps) {
  const isAlly = side === ParticipantSide.ALLY;

  const bgClass = isAlly
    ? "bg-green-50 dark:bg-green-950/20"
    : "bg-red-50 dark:bg-red-950/20";

  return (
    <div
      className={`flex items-center justify-between gap-2 p-3 border rounded-lg ${bgClass}`}
    >
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveToOtherSide}
          title={isAlly ? "Перемістити до ворогів" : "Перемістити до союзників"}
        >
          {isAlly ? "→" : "←"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          title="Видалити зі списку"
          className="text-muted-foreground hover:text-destructive"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
