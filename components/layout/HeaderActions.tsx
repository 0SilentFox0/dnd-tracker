'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { UserAvatar } from '@/components/auth/UserAvatar';
import { JoinBattleButton } from '@/components/campaigns/JoinBattleButton';
import { WatchShowButton } from '@/components/campaigns/WatchShowButton';
import { AbbreviationsInfoDialog } from '@/components/layout/AbbreviationsInfoDialog';
import { WhatsNewButton } from '@/components/onboarding/WhatsNewButton';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/lib/hooks/auth';

export function HeaderActions({ mode = 'all' }: { mode?: 'all' | 'primary' | 'secondary' }) {
    const t = useTranslations('common.header');

    const sessionUser = useSessionUser();

    return (
        <>
            {mode !== 'secondary' && <JoinBattleButton />}
            {mode !== 'secondary' && <WatchShowButton />}
            {mode !== 'primary' && sessionUser?.email && <WhatsNewButton />}
            {mode !== 'primary' && <AbbreviationsInfoDialog />}
            {mode !== 'secondary' && <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-hud-muted hover:bg-transparent hover:text-hud-ink"
            >
                <Link href="/profile">
                    <UserAvatar user={sessionUser} className="size-7" />
                    <span className="sr-only">{t('profile')}</span>
                </Link>
            </Button>}
        </>
    );
}
