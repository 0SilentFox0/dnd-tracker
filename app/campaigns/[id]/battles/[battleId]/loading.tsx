import "@/components/hud/hud.css";
import "@/components/battle/hud/battle-hud.css";
import { LoadingState } from "@/components/common/states";

export default function BattleLoading() {
  return (
    <div className="battle-hud flex min-h-[70dvh] items-center justify-center px-4">
      <LoadingState label="Завантаження бою…" className="w-full max-w-md" />
    </div>
  );
}
