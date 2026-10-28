import { Images } from "lucide-react";

export function ShowWaiting() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-hud-muted">
      <Images className="size-12" />
      <p className="text-lg">ДМ ще не почав показ</p>
    </div>
  );
}
