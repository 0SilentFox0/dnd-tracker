"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getSpellSchoolColor } from "@/lib/constants/spells";

function QuickStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-3 py-2 tabular-nums sm:px-4">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-semibold text-foreground sm:text-lg">
        {value}
      </span>
    </div>
  );
}

export interface CharacterHeroBlockProps {
  basicInfo: {
    name: string;
    class?: string;
    race?: string;
    level: number;
    avatar?: string | null;
  };
  combatStats: { armorClass: number; initiative: number; speed: number };
  heroHp: { total: number };
  damagePreview?: {
    melee: { total: number };
    ranged: { total: number };
  } | null;
  spellcasting: {
    spellSlots?: Record<string, { max: number; current: number }>;
  };
  schoolsByCount: Record<string, number>;
}

export function CharacterHeroBlock({
  basicInfo,
  combatStats,
  heroHp,
  damagePreview,
  spellcasting,
  schoolsByCount,
}: CharacterHeroBlockProps) {
  return (
    <Card className="mb-6 overflow-hidden border-primary/20 bg-linear-to-br from-card to-card/80 shadow-lg">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:shrink-0">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-primary/30 bg-muted sm:h-24 sm:w-24">
              {basicInfo.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={basicInfo.avatar}
                  alt={basicInfo.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                  {basicInfo.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 sm:text-center">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {basicInfo.name}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {[
                  basicInfo.class && `рівень ${basicInfo.level}`,
                  basicInfo.class,
                  basicInfo.race,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end sm:gap-3">
            <QuickStat label="AC" value={combatStats.armorClass} />
            <QuickStat label="HP" value={heroHp.total} />
            <QuickStat label="Ініц." value={combatStats.initiative} />
            <QuickStat label="Швидк." value={`${combatStats.speed} фт`} />
            {damagePreview && (
              <>
                <QuickStat
                  label="Melee damage ~"
                  value={damagePreview.melee?.total ?? "—"}
                />
                <QuickStat
                  label="Ranged damage ~"
                  value={damagePreview.ranged?.total ?? "—"}
                />
              </>
            )}
          </div>
        </div>
        {(Object.keys(schoolsByCount).length > 0 ||
          Object.keys(spellcasting.spellSlots ?? {}).length > 0) && (
          <div className="border-t border-border/50 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              {Object.keys(spellcasting.spellSlots ?? {}).length > 0 && (
                <div
                  className="flex items-center gap-2"
                  title="Магічні слоти за рівнями"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Слоти:
                  </span>
                  {Object.entries(spellcasting.spellSlots ?? {})
                    .sort(([a], [b]) =>
                      a === "universal"
                        ? -1
                        : b === "universal"
                          ? 1
                          : Number(a) - Number(b),
                    )
                    .map(([level, slot]) => {
                      const label =
                        level === "universal" ? "Унів." : `Рів.${level}`;

                      return (
                        <div
                          key={level}
                          className="flex items-center gap-0.5"
                          title={`${label}: ${slot.current}/${slot.max}`}
                        >
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {label}
                          </span>
                          {Array.from({ length: slot.max }).map((_, i) => (
                            <span
                              key={i}
                              className={`inline-block h-2 w-2 rounded-full ${
                                i < slot.current
                                  ? "bg-amber-400"
                                  : "border border-amber-400/50 bg-transparent"
                              }`}
                            />
                          ))}
                        </div>
                      );
                    })}
                </div>
              )}
              {Object.keys(schoolsByCount).length > 0 && (
                <div
                  className="flex items-center gap-2"
                  title="Вивчені школи магії"
                >
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Школи:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(schoolsByCount).map(([school, count]) => (
                      <span
                        key={school}
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-white ${getSpellSchoolColor(school)}`}
                        title={`${school}: ${count} заклинань`}
                      >
                        {school}
                        {count > 1 && (
                          <span className="opacity-90">×{count}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
