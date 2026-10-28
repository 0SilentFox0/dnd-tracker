import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/utils/common/error-message";

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const t = useTranslations("common.states");

  return (
    <div role="alert" data-slot="error-state" className={cn("flex flex-col items-center gap-3 rounded-lg border border-destructive/40 px-4 py-8 text-center", className)}>
      <p className="text-sm text-destructive">{errorMessage(error, t("error"))}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry} className="w-full sm:w-auto">
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
