import Link from "next/link";

import { EmptyState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export function NoCharacterState({ campaignId, canCreate }: { campaignId: string; canCreate: boolean }) {
  const base = `/campaigns/${campaignId}/character/new`;

  return (
    <HudPage>
      <EmptyState
        title="У вас поки немає персонажа в цій кампанії"
        action={
          canCreate ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href={base}>Створити персонажа</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`${base}?generate=1`}>🎲 Згенерувати</Link>
              </Button>
            </div>
          ) : undefined
        }
      />
    </HudPage>
  );
}
