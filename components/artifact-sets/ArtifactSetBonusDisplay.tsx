import { AbilitySummary } from "@/components/abilities";
import { cn } from "@/lib/utils";

export function ArtifactSetBonusDisplay({
  setBonus,
  abilitySummary = [],
  className,
}: {
  setBonus: unknown;
  abilitySummary?: string[];
  className?: string;
}) {
  const bonus = setBonus && typeof setBonus === "object" ? (setBonus as { name?: unknown; description?: unknown }) : {};

  const title = typeof bonus.name === "string" ? bonus.name.trim() : "";

  const desc = typeof bonus.description === "string" ? bonus.description.trim() : "";

  if (!title && !desc && abilitySummary.length === 0) return null;

  return (
    <div className={cn("rounded-md bg-[#1a140f] p-3 shadow-[inset_0_0_0_1px_#4a3c2c]", className)}>
      <p className="hud-sc text-xs tracking-[.06em] text-[#c9b37a]">Ефект сету</p>
      {title && <p className="mt-1.5 text-sm font-medium text-[#efe5d2]">{title}</p>}
      {desc && <p className="mt-1.5 text-xs leading-relaxed text-[#8f8473]">{desc}</p>}
      {abilitySummary.length > 0 && (
        <div className="mt-2">
          <AbilitySummary lines={abilitySummary} />
        </div>
      )}
    </div>
  );
}
