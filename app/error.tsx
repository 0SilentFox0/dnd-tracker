"use client";

import { ErrorState } from "@/components/common/states";
import { HudPage, HudPanel } from "@/components/hud/page";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <HudPage width="md">
      <HudPanel>
        <ErrorState error={error} onRetry={reset} />
      </HudPanel>
    </HudPage>
  );
}
