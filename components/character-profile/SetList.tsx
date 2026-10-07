import { cn } from "@/lib/utils";
import type { SetProgress } from "@/types/characters";

export function SetList({ sets }: { sets: SetProgress[] }) {
  if (sets.length === 0) return null;

  return (
    <ul>
      {sets.map((s) => (
        <li key={s.setId} className="border-b border-[#2a2218] py-2">
          <span className={cn("block text-sm", s.complete ? "text-[#e6c25a]" : "text-hud-ink")}>
            ✦ Сет «{s.name}» {s.have}/{s.total}
          </span>
          <span className="block text-xs text-hud-muted">{s.complete ? s.effects.join(" · ") : `З повним сетом: ${s.effects.join(" · ") || "—"}`}</span>
        </li>
      ))}
    </ul>
  );
}
