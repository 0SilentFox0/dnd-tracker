import { useTranslations } from "next-intl";

import { AbilitySummary } from "@/components/abilities";
import { cn } from "@/lib/utils";
import type { LogLine } from "@/types/text";

export function ArtifactSetBonusDisplay({
  setBonus,
  abilitySummary = [],
  className,
}: {
  setBonus: unknown;
  abilitySummary?: LogLine[];
  className?: string;
}) {
  const t = useTranslations("artifacts.sets.card");

  const bonus = setBonus && typeof setBonus === "object" ? (setBonus as { name?: unknown; description?: unknown }) : {};

  const title = typeof bonus.name === "string" ? bonus.name.trim() : "";

  const desc = typeof bonus.description === "string" ? bonus.description.trim() : "";

  if (!title && !desc && abilitySummary.length === 0) return null;

  return (
    <div className={cn("rounded-md bg-hud-field p-3 shadow-[inset_0_0_0_1px_var(--color-hud-line)]", className)}>
      <p className="hud-sc text-xs tracking-[.06em] text-hud-gold">{t("bonus")}</p>
      {title && <p className="mt-1.5 text-sm font-medium text-hud-ink">{title}</p>}
      {desc && <p className="mt-1.5 text-xs leading-relaxed text-hud-muted">{desc}</p>}
      {abilitySummary.length > 0 && (
        <div className="mt-2">
          <AbilitySummary lines={abilitySummary} />
        </div>
      )}
    </div>
  );
}
