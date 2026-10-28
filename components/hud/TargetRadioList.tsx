import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");

  const isOn = (id: string) => (Array.isArray(value) ? value.includes(id) : value === id);

  return (
    <div className={cn("grid gap-1", className)} role="radiogroup" aria-label={t("ui.target")}>
      {targets.map((target) => (
        <OptionButton key={target.basicInfo.id} role="radio" checked={isOn(target.basicInfo.id)} title={target.basicInfo.name} onClick={() => onChange(target.basicInfo.id)} />
      ))}
    </div>
  );
}
