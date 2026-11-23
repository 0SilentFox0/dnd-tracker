import { dmSectionHref, dmSectionsFor } from '@/lib/constants/campaigns';

type Section =
    | 'dashboard'
    | 'battle'
    | 'world'
    | 'character'
    | 'scenario'
    | 'show';

export function campaignGameNavigation({
    id,
    isDM,
    context,
    activeBattleId,
    hasWorld,
    label,
}: {
    id: string;
    isDM: boolean;
    context: Parameters<typeof dmSectionsFor>[0];
    activeBattleId?: string;
    hasWorld: boolean;
    label: (section: Section) => string;
}) {
    const navItems: { id: string; label: string; href: string }[] = [
        {
            id: 'overview',
            label: label('dashboard'),
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
                    label: label('world'),
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
                    label: label(item.id),
                    href: dmSectionHref(id, section),
                });
            }
        }
    } else {
        if (activeBattleId) {
            navItems.push({
                id: 'battle',
                label: label('battle'),
                href: `/campaigns/${id}/battles/${activeBattleId}`,
            });
        }

        if (hasWorld) {
            navItems.push({
                id: 'world',
                label: label('world'),
                href: `/campaigns/${id}/world`,
            });
        }

        navItems.push(
            {
                id: 'character',
                label: label('character'),
                href: `/campaigns/${id}/character`,
            },
            {
                id: 'show',
                label: label('show'),
                href: `/campaigns/${id}/show`,
            }
        );
    }

    return navItems;
}
