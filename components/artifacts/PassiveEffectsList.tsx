import { ArtifactDeltaBadge } from "@/components/characters/stats/ArtifactDeltaBadge";
import { Badge } from "@/components/ui/badge";
import { getStatLabel, getTypeLabel } from "@/lib/constants/skill-effects";
import { cn } from "@/lib/utils";

export type PassiveEffectListItem = {
  stat: string;
  type?: string;
  value?: number | string | boolean;
  isPercentage?: boolean;
};

function isPercentEffect(p: PassiveEffectListItem): boolean {
  return Boolean(p.isPercentage || p.type === "percent");
}

function EffectValue({ p }: { p: PassiveEffectListItem }) {
  const v = p.value;

  if (v === undefined || v === null) {
    return (
      <Badge variant="secondary" className="text-[10px] font-normal">
        Активно
      </Badge>
    );
  }

  if (typeof v === "boolean") {
    return (
      <Badge variant="secondary" className="text-[10px] font-normal">
        {v ? "Активно" : "Вимкнено"}
      </Badge>
    );
  }

  if (typeof v === "string") {
    return <span className="font-medium text-foreground">{v}</span>;
  }

  if (typeof v === "number") {
    return (
      <ArtifactDeltaBadge value={v} isPercentage={isPercentEffect(p)} />
    );
  }

  return null;
}

export function PassiveEffectsList({
  effects,
  className,
  itemClassName,
}: {
  effects: PassiveEffectListItem[];
  className?: string;
  itemClassName?: string;
}) {
  if (effects.length === 0) return null;

  return (
    <ul className={cn("space-y-1.5", className)}>
      {effects.map((p, i) => (
        <li
          key={i}
          className={cn(
            "flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs",
            itemClassName,
          )}
        >
          <span className="font-medium text-foreground">
            {getStatLabel(p.stat)}
          </span>
          {p.type ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {getTypeLabel(p.type)}
            </Badge>
          ) : null}
          <EffectValue p={p} />
        </li>
      ))}
    </ul>
  );
}
