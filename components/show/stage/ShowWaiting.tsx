import { Hourglass, Images } from "lucide-react";

export function ShowWaiting({ paused = false }: { paused?: boolean }) {
  const Icon = paused ? Hourglass : Images;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-hud-muted">
      <Icon className="size-12" />
      <p className="text-lg">{paused ? "Перерва — скоро продовжимо" : "ДМ ще не почав показ"}</p>
    </div>
  );
}
