"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingFlags } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import { HIDE_ALL_HINTS_KEY } from "@/lib/onboarding/flag-keys";

export function HelpSettings() {
  const t = useTranslator("onboarding");

  const { flags, setFlag, reset } = useOnboardingFlags();

  if (!flags) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {HIDE_ALL_HINTS_KEY in flags ? (
        <Button variant="outline" size="sm" onClick={() => reset("hints")}>
          {t("ui.showHintsAgain")}
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setFlag(HIDE_ALL_HINTS_KEY)}>
          {t("ui.hideAllHints")}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => reset("checklists")}>
        {t("ui.restoreChecklists")}
      </Button>
    </div>
  );
}
