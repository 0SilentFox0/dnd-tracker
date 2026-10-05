import "@/components/battle/hud/battle-hud.css";
import { LoadingState } from "@/components/common/states";

export default function BattleLoading() {
  return (
    <div className="battle-hud flex h-dvh items-center justify-center px-4">
      <LoadingState label="Завантаження бою…" className="w-full max-w-md" />
    </div>
  );
}
