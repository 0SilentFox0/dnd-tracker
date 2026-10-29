import { useTranslations } from "next-intl";
import { Hourglass, Images } from "lucide-react";

export function ShowWaiting({ paused = false, message }: { paused?: boolean; message?: string }) {
  const t = useTranslations("show");

  const Icon = paused ? Hourglass : Images;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-hud-muted">
      <Icon className="size-12" />
      <p className="text-lg">{message ?? (paused ? t("waiting.paused") : t("waiting.notStarted"))}</p>
    </div>
  );
}
