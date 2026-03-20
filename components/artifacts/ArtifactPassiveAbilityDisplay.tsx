import { Users, Wand2 } from "lucide-react";

import type { PassiveEffectListItem } from "@/components/artifacts/PassiveEffectsList";
import { PassiveEffectsList } from "@/components/artifacts/PassiveEffectsList";
import {
  ARTIFACT_EFFECT_AUDIENCE_OPTIONS,
  parseEffectScopeObject,
} from "@/lib/constants/artifact-effect-scope";
import { cn } from "@/lib/utils";

function audienceMeta(audience: string | undefined) {
  if (!audience) return null;

  return ARTIFACT_EFFECT_AUDIENCE_OPTIONS.find((o) => o.value === audience);
}

function normalizeEffects(raw: unknown): PassiveEffectListItem[] {
  if (!Array.isArray(raw)) return [];

  const out: PassiveEffectListItem[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const p = item as Record<string, unknown>;

    const stat = p.stat;

    if (typeof stat !== "string") continue;

    const val = p.value;

    let value: PassiveEffectListItem["value"];

    if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") {
      value = val;
    }

    out.push({
      stat,
      type: typeof p.type === "string" ? p.type : undefined,
      value,
      isPercentage: Boolean(p.isPercentage),
    });
  }

  return out;
}

export function ArtifactPassiveAbilityDisplay({
  passiveAbility,
  className,
  heading = "Пасив артефакту",
}: {
  passiveAbility: unknown;
  className?: string;
  /** Заголовок блоку (на картці персонажа можна змінити). */
  heading?: string;
}) {
  if (passiveAbility == null) return null;

  if (typeof passiveAbility === "string") {
    const t = passiveAbility.trim();

    if (!t) return null;

    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {heading}
        </p>
        <p className="mt-1 leading-relaxed">{t}</p>
      </div>
    );
  }

  if (typeof passiveAbility !== "object" || passiveAbility === null) {
    return null;
  }

  const o = passiveAbility as Record<string, unknown>;

  const name = typeof o.name === "string" ? o.name.trim() : "";

  const description =
    typeof o.description === "string" ? o.description.trim() : "";

  const effects = normalizeEffects(o.effects);

  const scope = parseEffectScopeObject(o.effectScope);

  const audience = audienceMeta(scope.effectAudience);

  const immune = scope.immuneSpellIds ?? [];

  const hasImmune = immune.length > 0;

  const structured =
    Boolean(description) ||
    effects.length > 0 ||
    Boolean(audience) ||
    hasImmune ||
    Boolean(name);

  const showFallback =
    !structured &&
    Object.keys(o).length > 0;

  if (!structured && !showFallback) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-muted/25 p-2.5 text-xs",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {heading}
      </p>
      {name ? (
        <p className="mt-1 font-medium text-foreground">{name}</p>
      ) : null}

      {description ? (
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {audience ? (
        <div className="mt-2 flex items-start gap-2">
          <Users
            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">{audience.label}</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              {audience.description}
            </p>
          </div>
        </div>
      ) : null}

      {effects.length > 0 ? (
        <PassiveEffectsList effects={effects} className="mt-2" />
      ) : null}

      {hasImmune ? (
        <div className="mt-2 flex items-start gap-2 border-t border-border/50 pt-2">
          <Wand2
            className="mt-0.5 size-3.5 shrink-0 text-violet-600 dark:text-violet-400"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">
              Імунітет до заклинань
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {immune.slice(0, 6).join(", ")}
              {immune.length > 6 ? ` … (+${immune.length - 6})` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {showFallback ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-background/50 p-1.5 font-mono text-[10px] text-muted-foreground">
          {JSON.stringify(passiveAbility, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
