'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';

import { ProfileEmptyState } from '@/components/profile/ProfileEmptyState';
import { ProfileSectionCard } from '@/components/profile/ProfileSectionCard';
import { avatarHue } from '@/lib/utils/auth/avatar';
import {
    isHostedOnProjectStorage,
    toMediaUrl,
} from '@/lib/utils/common/image-url';
import type { ProfileCharacter } from '@/types/profile';

function Portrait({ hero }: { hero: ProfileCharacter }) {
    return (
        <span
            aria-hidden
            className="hud-sc relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg text-lg text-white"
            style={{
                backgroundColor: `hsl(${avatarHue(hero.id)}, 40%, 28%)`,
            }}
        >
            {hero.avatar ? (
                <Image
                    src={toMediaUrl(hero.avatar)}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                    unoptimized={!isHostedOnProjectStorage(hero.avatar)}
                />
            ) : (
                hero.name.slice(0, 1).toUpperCase()
            )}
        </span>
    );
}

export function ProfileHeroes({ heroes }: { heroes: ProfileCharacter[] }) {
    const t = useTranslations('auth.profileSummary');

    return (
        <ProfileSectionCard title={t('heroesTitle')}>
            {heroes.length === 0 ? (
                <ProfileEmptyState
                    icon={UserRound}
                    text={t('heroesEmpty')}
                    href="/campaigns"
                    cta={t('campaignsEmptyLink')}
                />
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {heroes.map((h) => (
                        <li key={h.id}>
                            <Link
                                href={`/campaigns/${h.campaignId}/character`}
                                className="flex min-h-14 items-center gap-3 rounded-lg px-2 py-2 hover:bg-hud-panel-2"
                            >
                                <Portrait hero={h} />
                                <span className="min-w-0">
                                    <span className="block truncate text-hud-ink">
                                        {h.name}
                                    </span>
                                    <span className="block truncate text-xs text-hud-muted">
                                        {t('heroLine', { level: h.level })}
                                    </span>
                                    <span className="block truncate text-xs text-hud-muted">
                                        {h.campaignName}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </ProfileSectionCard>
    );
}
