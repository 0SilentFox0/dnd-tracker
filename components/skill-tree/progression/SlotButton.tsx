import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { NodeState } from "@/lib/utils/skills/progression";

export function SlotButton({ state, label, icon, size, onSelect }: { state: NodeState; label: string; icon: string | null; size: 46 | 40; onSelect: () => void }) {
  const aria = state.state === "learned" ? label : state.state === "available" ? `Вивчити: ${label}` : `Закрито: ${label}`;

  const tone = state.state === "learned" ? "skill-slot learned" : state.state === "available" ? "skill-slot available" : "skill-slot locked";

  return (
    <button type="button" aria-label={aria} onClick={onSelect} disabled={!state.nodeId} className="flex min-h-11 min-w-11 items-center justify-center">
      <span className={tone} style={{ width: size, height: size }}>
        {state.state === "learned" && icon ? <OptimizedImage src={icon} alt="" width={size} height={size} className="h-full w-full object-cover" fallback={<span className="hud-sc">?</span>} /> : <span className="hud-sc">?</span>}
      </span>
    </button>
  );
}
