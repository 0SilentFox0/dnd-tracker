import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <HudPage width="md">
      <HudPanel>
        <EmptyState
          title="Сторінку не знайдено"
          action={
            <Button asChild>
              <Link href="/campaigns">На головну</Link>
            </Button>
          }
        />
      </HudPanel>
    </HudPage>
  );
}
