import Link from "next/link";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";

export type BattleListKind = "active" | "prepared" | "completed";

interface BattleListCardProps {
  battle: { id: string; name: string; description: string | null; currentRound: number; participants: unknown };
  campaignId: string;
  kind: BattleListKind;
}

const CHIP = "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold";

const KIND = {
  active: { tone: "active", badge: <span className={`${CHIP} metal-gold metal-fill`}>Активний</span> },
  prepared: { tone: "default", badge: <span className={`${CHIP} text-[#e6dccb] shadow-[inset_0_0_0_1px_#c9b37a]`}>Підготовлено</span> },
  completed: { tone: "muted", badge: <span className={`${CHIP} text-[#8f8473] shadow-[inset_0_0_0_1px_#4a3c2c]`}>Завершено</span> },
} as const;

export function BattleListCard({ battle, campaignId, kind }: BattleListCardProps) {
  const participantCount = Array.isArray(battle.participants) ? battle.participants.length : 0;

  const editHref = `/campaigns/${campaignId}/dm/battles/${battle.id}`;

  const playHref = `/campaigns/${campaignId}/battles/${battle.id}`;

  return (
    <HudCard tone={KIND[kind].tone} className="space-y-3 p-4">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="hud-sc min-w-0 text-lg leading-tight text-[#efe5d2]">{battle.name}</h3>
          {KIND[kind].badge}
        </div>
        {battle.description && <p className="text-sm text-[#8f8473]">{battle.description}</p>}
      </div>

      <div className="text-sm text-[#8f8473]">
        {kind === "active" && (
          <p>
            Раунд: <span className="font-semibold text-[#e6dccb]">{battle.currentRound}</span>
          </p>
        )}
        <p>
          Учасників: <span className="font-semibold text-[#e6dccb]">{participantCount}</span>
        </p>
      </div>

      {kind === "active" && (
        <Link href={playHref} className="block">
          <Button className="w-full">Перейти до бою</Button>
        </Link>
      )}
      {kind === "prepared" && (
        <div className="flex gap-2">
          <Link href={editHref} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              Редагувати
            </Button>
          </Link>
          <Link href={playHref} className="flex-1">
            <Button className="w-full" size="sm">
              Запустити
            </Button>
          </Link>
        </div>
      )}
      {kind === "completed" && (
        <Link href={editHref} className="block">
          <Button variant="outline" size="sm" className="w-full">
            Переглянути
          </Button>
        </Link>
      )}
    </HudCard>
  );
}
