"use client";

import { Button } from "@/components/ui/button";
import { useOnboardingFlags } from "@/lib/hooks/onboarding";
import { HIDE_ALL_HINTS_KEY } from "@/lib/onboarding/flag-keys";

export function HelpSettings() {
  const { flags, setFlag, reset } = useOnboardingFlags();

  if (!flags) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {HIDE_ALL_HINTS_KEY in flags ? (
        <Button variant="outline" size="sm" onClick={() => reset("hints")}>
          Показати підказки знову
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setFlag(HIDE_ALL_HINTS_KEY)}>
          Сховати всі підказки
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => reset("checklists")}>
        Повернути чеклісти перших кроків
      </Button>
    </div>
  );
}
