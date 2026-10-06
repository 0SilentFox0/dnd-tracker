import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Button } from "@/components/ui/button";
import type { NodeState } from "@/lib/utils/skills/progression";

export function SlotButton({ state, label, icon, onSelect }: { state: NodeState; label: string; icon: string | null; onSelect: () => void }) {
  const aria = state.state === "learned" ? label : state.state === "available" ? `Вивчити: ${label}` : `Закрито: ${label}`;

  const tone = state.state === "learned" ? "skill-slot learned" : state.state === "available" ? "skill-slot available" : "skill-slot locked";

  return (
    <Button type="button" variant="ghost" aria-label={aria} onClick={onSelect} disabled={!state.nodeId} className="h-auto whitespace-normal rounded-none p-0 font-normal hover:bg-transparent dark:hover:bg-transparent flex items-center justify-center disabled:opacity-100">
      <span className={tone}>
        {state.state === "learned" ? (
          icon ? (
            <OptimizedImage src={icon} alt="" width={56} height={56} className="h-full w-full object-cover" fallback={<span className="hud-sc">{label[0]}</span>} />
          ) : (
            <span className="hud-sc">{label[0]}</span>
          )
        ) : (
          <span className="hud-sc">?</span>
        )}
      </span>
    </Button>
  );
}
