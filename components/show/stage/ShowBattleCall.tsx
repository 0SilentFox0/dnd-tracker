import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Swords } from 'lucide-react';

import { usePlayerView } from '@/lib/hooks/common';
import type { ShowBattle } from '@/types/show';

export function ShowBattleCall({
    campaignId,
    battle,
    playerView = false,
}: {
    campaignId: string;
    battle: ShowBattle;
    playerView?: boolean;
}) {
    const t = useTranslations('show');

    const battleView = usePlayerView({ kind: 'battle', id: battle.id });

    return (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <Link
                href={`/campaigns/${campaignId}/battles/${battle.id}`}
                onClick={() => playerView && battleView.set(true)}
                className="group pointer-events-auto relative flex flex-col items-center gap-1 rounded-xl border-2 border-hud-gold-strong bg-black px-10 py-6 text-hud-bone shadow-2xl"
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-1 -z-10 animate-pulse rounded-2xl bg-hud-gold-strong/60 blur-md group-hover:animate-none"
                />
                <span className="flex items-center gap-3 text-3xl font-bold tracking-wide uppercase">
                    <Swords className="size-8" />
                    {t('battleCall.go')}
                </span>
                <span className="text-sm text-hud-muted">{battle.name}</span>
            </Link>
        </div>
    );
}
