"use client";

import { useLocale, useTranslations } from "next-intl";

import { SetupEntityCard } from "./SetupEntityCard";

import { HudSection } from "@/components/hud/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { clampUnitQuantity, UNIT_QUANTITY } from "@/lib/constants/battle-units";
import { groupDisplayName } from "@/lib/constants/ungrouped";
import type { ParticipantActions, ParticipantSelection } from "@/lib/hooks/battles";
import { groupUnitsByRaceName } from "@/lib/utils/units/group-units";
import type { EntityStats, SetupUnit } from "@/types/battle-setup";

interface UnitsListCardProps {
  units: SetupUnit[];
  entityStats: Record<string, EntityStats> | null;
  selection: ParticipantSelection;
  actions: Pick<ParticipantActions, "cycleUnit" | "addToSide" | "setQuantity">;
}

interface UnitRowProps {
  unit: SetupUnit;
  stats: EntityStats | undefined;
  state: { isSelected: boolean; side: ParticipantSide | null; quantity: number };
  actions: { onToggle: () => void; onAddToEnemies: () => void; onQuantityChange: (value: number) => void };
}

function UnitRow({ unit, stats, state, actions }: UnitRowProps) {
  const t = useTranslations("battleSetup.units");

  const { isSelected, side, quantity } = state;

  const isEnemy = side === ParticipantSide.ENEMY;

  const badge = isEnemy ? (
    <span className="text-xs font-medium text-red-600 dark:text-red-400">{t("enemy")}</span>
  ) : side === ParticipantSide.ALLY ? (
    <span className="text-xs font-medium text-primary">{t("ally")}</span>
  ) : null;

  return (
    <SetupEntityCard
      entity={unit}
      fallbackIcon="⚔️"
      title={<span className="font-normal text-muted-foreground"> · {t("tier", { level: unit.level ?? 1 })}</span>}
      stats={stats}
      state={{ isSelected, isEnemy, badge }}
      onToggle={actions.onToggle}
    >
      <div className="flex flex-wrap items-center gap-3 border-t border-border/50 px-4 pb-4 pt-0">
        <div className="flex items-center gap-2">
          <label htmlFor={`quantity-${unit.id}`} className="whitespace-nowrap text-sm text-muted-foreground">
            {t("quantity")}
          </label>
          <Input
            id={`quantity-${unit.id}`}
            type="number"
            min={UNIT_QUANTITY.min}
            max={UNIT_QUANTITY.max}
            value={quantity}
            onChange={(e) => actions.onQuantityChange(clampUnitQuantity(parseInt(e.target.value, 10)))}
            className="h-8 w-20"
          />
        </div>
        <Button type="button" variant={isEnemy ? "secondary" : "outline"} size="sm" onClick={actions.onAddToEnemies} disabled={isEnemy}>
          {isEnemy ? t("alreadyEnemy") : t("toEnemies")}
        </Button>
      </div>
    </SetupEntityCard>
  );
}

export function UnitsListCard({ units, entityStats, selection, actions }: UnitsListCardProps) {
  const t = useTranslations("battleSetup.units");

  const tGame = useTranslations("gameTerms.ungrouped");

  const locale = useLocale();

  if (units.length === 0) {
    return (
      <HudSection title={t("title")}>
        <p className="text-xs text-muted-foreground">
          {t("hintEmpty")}
        </p>
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("empty")}
        </p>
      </HudSection>
    );
  }

  const byRace = groupUnitsByRaceName(units);

  const raceLabel = (key: string) => groupDisplayName(key, tGame("race"));

  const raceOrder = [...byRace.keys()].sort((a, b) =>
    raceLabel(a).localeCompare(raceLabel(b), locale),
  );

  return (
    <HudSection title={t("title")} className="mt-0 max-h-[600px] space-y-4 overflow-y-auto">
      <p className="text-xs text-muted-foreground">
        {t("hint")}
      </p>
        <Accordion
          type="multiple"
          defaultValue={raceOrder}
          className="space-y-2"
        >
          {raceOrder.map((raceKey) => {
            const raceUnits = byRace.get(raceKey) ?? [];

            return (
              <AccordionItem key={raceKey} value={raceKey}>
                <AccordionTrigger className="py-3 text-sm">
                  {raceLabel(raceKey)} ({raceUnits.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {raceUnits.map((unit) => {
                    const isSelected = selection.isSelected(unit.id);

                    const side = selection.sideOf(unit.id);

                    const quantity = selection.quantityOf(unit.id);

                    return (
                      <UnitRow
                        key={unit.id}
                        unit={unit}
                        stats={entityStats?.[unit.id]}
                        state={{ isSelected, side, quantity }}
                        actions={{
                          onToggle: () => actions.cycleUnit(unit.id),
                          onAddToEnemies: () => {
                            if (side !== ParticipantSide.ENEMY) actions.addToSide(unit.id, ParticipantSourceType.UNIT, ParticipantSide.ENEMY, quantity);
                          },
                          onQuantityChange: (value) => actions.setQuantity(unit.id, value),
                        }}
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
    </HudSection>
  );
}
