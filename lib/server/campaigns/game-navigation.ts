import 'server-only';
import { dmSectionHref, dmSectionsFor } from '@/lib/constants/campaigns';
import type { Translator } from '@/lib/i18n/translator';
import type { PlayerDashboardData } from '@/types/campaigns';

export function campaignGameNavigation(
    id: string,
    isDM: boolean,
    context: Parameters<typeof dmSectionsFor>[0],
    player: Pick<PlayerDashboardData, 'activeBattle' | 'hasWorld'> | null,
    t: Translator
) {
    const navItems: { id: string; label: string; href: string }[] = [
        {
            id: 'overview',
            label: t('gameNavigation.dashboard'),
            href: `/campaigns/${id}`,
        },
    ];

    if (isDM) {
        const visibleSections = dmSectionsFor(context);

        for (const item of [
            { id: 'battle', path: 'battles' },
            { id: 'world' },
            { id: 'character', path: 'characters' },
            { id: 'scenario', path: 'scenario' },
            { id: 'show', path: 'show' },
        ] as const) {
            if (item.id === 'world') {
                navItems.push({
                    id: item.id,
                    label: t('gameNavigation.world'),
                    href: `/campaigns/${id}/dm/world`,
                });
                continue;
            }

            const section = visibleSections.find(
                (candidate) => candidate.path === item.path
            );

            if (section) {
                navItems.push({
                    id: item.id,
                    label: t(`gameNavigation.${item.id}`),
                    href: dmSectionHref(id, section),
                });
            }
        }
    } else {
        if (player?.activeBattle) {
            navItems.push({
                id: 'battle',
                label: t('gameNavigation.battle'),
                href: `/campaigns/${id}/battles/${player.activeBattle.battleId}`,
            });
        }

        if (player?.hasWorld) {
            navItems.push({
                id: 'world',
                label: t('gameNavigation.world'),
                href: `/campaigns/${id}/world`,
            });
        }

        navItems.push(
            {
                id: 'character',
                label: t('gameNavigation.character'),
                href: `/campaigns/${id}/character`,
            },
            {
                id: 'show',
                label: t('gameNavigation.show'),
                href: `/campaigns/${id}/show`,
            }
        );
    }

    navItems.push({
        id: 'journal',
        label: t('gameNavigation.journal'),
        href: `/campaigns/${id}/journal`,
    });

    return navItems;
}
