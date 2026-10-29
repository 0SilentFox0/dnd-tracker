import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AttackType } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { HERO_LEVELS } from "@/lib/hooks/campaigns";

interface DiceTableEditorProps {
  title: string;
  type: AttackType;
  table: Record<string, string> | null;
  onChange: (table: Record<string, string> | null) => void;
}

export function DiceTableEditor({ title, type, table, onChange }: DiceTableEditorProps) {
  const t = useTranslations("rules");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-hud-ink">{title}</h3>
        <Button type="button" variant="outline" size="sm" disabled={table === null} onClick={() => onChange(null)}>
          {t("diceTable.reset")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-4">
        {HERO_LEVELS.map((level) => (
          <label key={level} className="flex items-center gap-2 text-xs text-hud-muted">
            <span className="w-5 shrink-0 text-right">{level}</span>
            <Input
              aria-label={t("diceTable.levelLabel", { title, level })}
              className="h-8 px-2 text-sm"
              value={table?.[level] ?? ""}
              placeholder={getHeroDamageDiceForLevel(level, type)}
              onChange={(e) => onChange({ ...table, [level]: e.target.value })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
