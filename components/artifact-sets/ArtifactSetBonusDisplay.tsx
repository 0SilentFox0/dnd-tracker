import { Users, Wand2 } from "lucide-react";

import { PassiveEffectsList } from "@/components/artifacts/PassiveEffectsList";
import { ArtifactDeltaBadge } from "@/components/characters/stats/ArtifactDeltaBadge";
import { ARTIFACT_EFFECT_AUDIENCE_OPTIONS } from "@/lib/constants/artifact-effect-scope";
import { parseArtifactSetBonus } from "@/lib/types/artifact-set-bonus";
import { cn } from "@/lib/utils";
import { collectSetBonusNumericLines } from "@/lib/utils/artifacts/set-bonus-display-lines";

function audienceMeta(audience: string | undefined) {
  if (!audience) return null;

  return ARTIFACT_EFFECT_AUDIENCE_OPTIONS.find((o) => o.value === audience);
}

export function ArtifactSetBonusDisplay({
  setBonus,
  className,
}: {
  setBonus: unknown;
  className?: string;
}) {
  if (setBonus == null) return null;

  const parsed = parseArtifactSetBonus(setBonus);

  const lines = collectSetBonusNumericLines(parsed);

  const audience = audienceMeta(parsed.effectAudience);

  const immuneSpellIds = parsed.immuneSpellIds ?? [];

  const hasImmune = immuneSpellIds.length > 0;

  const desc = parsed.description?.trim();

  const title = parsed.name?.trim();

  const hasPassives = parsed.passiveEffects.length > 0;

  const hasNumeric = lines.length > 0;

  const structured =
    Boolean(desc) ||
    Boolean(title) ||
    hasNumeric ||
    hasPassives ||
    Boolean(audience) ||
    hasImmune;

  const rawObject =
    typeof setBonus === "object" && setBonus !== null && !Array.isArray(setBonus);

  const showFallbackJson =
    !structured &&
    rawObject &&
    Object.keys(setBonus as object).length > 0;

  if (typeof setBonus === "string") {
    const t = setBonus.trim();

    if (!t) return null;

    return (
      <div
        className={cn(
          "rounded-lg border border-border/80 bg-muted/30 p-3 text-sm",
          className,
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Ефект сету
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{t}</p>
      </div>
    );
  }

  if (!structured && !showFallbackJson) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-linear-to-b from-muted/40 to-muted/20 p-3 shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Ефект сету
      </p>

      {title ? (
        <p className="mt-1.5 text-sm font-medium text-foreground">{title}</p>
      ) : null}

      {desc ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      ) : null}

      {audience ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
          <Users
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{audience.label}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {audience.description}
            </p>
          </div>
        </div>
      ) : null}

      {hasNumeric ? (
        <ul className="mt-3 space-y-1">
          {lines.map((line, i) => (
            <li
              key={i}
              className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs"
            >
              <span className="text-muted-foreground">{line.label}</span>
              <ArtifactDeltaBadge
                value={line.value}
                isPercentage={line.isPercentage}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {hasPassives ? (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Пасивні ефекти
          </p>
          <PassiveEffectsList effects={parsed.passiveEffects} />
        </div>
      ) : null}

      {hasImmune ? (
        <div className="mt-3 flex items-start gap-2 border-t border-border/60 pt-3">
          <Wand2
            className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400"
            aria-hidden
          />
          <div className="min-w-0 text-xs">
            <p className="font-medium text-foreground">Імунітет до заклинань</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {immuneSpellIds.slice(0, 8).join(", ")}
              {immuneSpellIds.length > 8
                ? ` … (+${immuneSpellIds.length - 8})`
                : ""}
            </p>
          </div>
        </div>
      ) : null}

      {showFallbackJson ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-background/60 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {JSON.stringify(setBonus, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
