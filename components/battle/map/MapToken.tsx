import { HealthBar, Portrait } from "@/components/battle/hud";
import { cn } from "@/lib/utils";
import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export interface MapTokenProps {
  participant: BattleParticipant;
  box: { cx: number; cy: number; size: number };
  mapSize: { width: number; height: number };
  pxPerUnit: number;
  selected?: boolean;
  current?: boolean;
  onClick?: (id: string) => void;
}

export function MapToken({ participant, box, mapSize, pxPerUnit, selected, current, onClick }: MapTokenProps) {
  const { id, name } = participant.basicInfo;

  const { width, height } = mapSize;

  const portraitPx = Math.max(12, Math.round(box.size * pxPerUnit * 0.8));

  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: `${((box.cx - box.size / 2) / width) * 100}%`,
        top: `${((box.cy - box.size / 2) / height) * 100}%`,
        width: `${(box.size / width) * 100}%`,
        height: `${(box.size / height) * 100}%`,
        zIndex: isDown(participant) ? 1 : 2,
      }}
    >
      <button
        type="button"
        aria-label={name}
        data-fx-participant={id}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(id);
        }}
        className={cn("flex h-full w-full flex-col items-center justify-center rounded-full", selected && "ring-2 ring-[var(--gold)]")}
      >
        <Portrait participant={participant} size={portraitPx} current={current} />
        <HealthBar participant={participant} exact className="mt-0.5 w-[90%]" />
      </button>
    </div>
  );
}
