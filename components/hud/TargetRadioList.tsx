import { OptionButton } from "@/components/hud/OptionButton";
import { cn } from "@/lib/utils";
import type { BattleParticipant } from "@/types/battle";

interface TargetRadioListProps {
  targets: readonly BattleParticipant[];
  value: string | readonly string[] | null;
  onChange: (id: string) => void;
  className?: string;
}

export function TargetRadioList({ targets, value, onChange, className }: TargetRadioListProps) {
  const isOn = (id: string) => (Array.isArray(value) ? value.includes(id) : value === id);

  return (
    <div className={cn("grid gap-1", className)} role="radiogroup" aria-label="Ціль">
      {targets.map((t) => (
        <OptionButton key={t.basicInfo.id} role="radio" checked={isOn(t.basicInfo.id)} title={t.basicInfo.name} onClick={() => onChange(t.basicInfo.id)} />
      ))}
    </div>
  );
}
