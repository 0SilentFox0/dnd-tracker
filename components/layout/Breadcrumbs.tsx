'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronRight, Home } from 'lucide-react';

import { DM_SECTIONS } from '@/lib/constants/campaigns';
import { STATIC_PUBLIC_PATHS } from '@/lib/constants/site';
import type { Translator } from '@/lib/i18n/translator';
import { useTranslator } from '@/lib/i18n/use-translator';
import { cn } from '@/lib/utils';

const SEGMENT_KEYS = [
    'campaigns',
    'dm',
    'character',
    'inventory',
    'new',
    'edit',
    'sets',
    'groups',
    'main-skills',
    'info',
    'print',
    'world',
    'show',
    'scenario',
    'graph',
] as const;

const ID_KEYS = [
    'campaigns',
    'battles',
    'characters',
    'units',
    'spells',
    'artifacts',
    'sets',
] as const;

const isIn = <T extends string>(
    keys: readonly T[],
    value: string | undefined
): value is T => !!value && (keys as readonly string[]).includes(value);

type Translate = ReturnType<typeof useTranslations<'common.breadcrumbs'>>;

const DM_SECTION_PATHS = DM_SECTIONS.map((s) => s.path);

function getLabel(
    t: Translate,
    tCommon: Translator,
    segment: string,
    previous?: string
) {
    if (isIn(SEGMENT_KEYS, segment)) return t(`segments.${segment}`);

    if (isIn(DM_SECTION_PATHS, segment))
        return tCommon(`dmSections.${segment}`);

    if (isIn(ID_KEYS, previous)) return t(`ids.${previous}`);

    return t('details');
}

export function Breadcrumbs() {
    const t = useTranslations('common.breadcrumbs');

    const tHeader = useTranslations('common.header');

    const tCommon = useTranslator('common');

    const pathname = usePathname();

    if (
        pathname?.startsWith('/sign-in') ||
        pathname?.startsWith('/sign-up') ||
        STATIC_PUBLIC_PATHS.includes(pathname)
    ) {
        return null;
    }

    const allSegments = pathname.split('/').filter(Boolean);

    if (allSegments.length === 0) return null;

    const crumbs: Array<{ href: string; label: string; isLast: boolean }> = [];

    let previousDisplaySegment: string | undefined;

    for (let i = 0; i < allSegments.length; i++) {
        const segment = allSegments[i];

        const isLastSegment = i === allSegments.length - 1;

        // dm/battles stay in hrefs but only get their own crumb when they are the page itself; /settings has no page
        if (
            segment === 'dm' ||
            segment === 'settings' ||
            (segment === 'system' && !isLastSegment) ||
            (segment === 'battles' && !isLastSegment)
        ) {
            previousDisplaySegment = segment;
            continue;
        }

        // the home icon is the "campaigns" crumb
        if (segment === 'campaigns' && i === 0 && !isLastSegment) {
            previousDisplaySegment = segment;
            continue;
        }

        crumbs.push({
            href: `/${allSegments.slice(0, i + 1).join('/')}`,
            label: getLabel(t, tCommon, segment, previousDisplaySegment),
            isLast: isLastSegment,
        });

        previousDisplaySegment = segment;
    }

    if (crumbs.length === 0) return null;

    const homeCrumb = allSegments[0] !== 'campaigns' || allSegments.length > 1;

    return (
        <nav aria-label={t('label')} className="min-w-0 text-sm text-hud-muted">
            <ol className="flex min-w-0 flex-nowrap items-center gap-1 whitespace-nowrap">
                {homeCrumb && (
                    <li className="hidden shrink-0 items-center gap-1 sm:flex">
                        <Link
                            href="/campaigns"
                            className="flex items-center text-hud-muted transition-colors hover:text-hud-ink"
                        >
                            <Home className="h-3.5 w-3.5" />
                            <span className="sr-only">{tHeader('home')}</span>
                        </Link>
                        <ChevronRight className="h-3 w-3 text-hud-line" />
                    </li>
                )}
                {crumbs.map((crumb, index) => (
                    <li
                        key={crumb.href}
                        className={cn(
                            'flex min-w-0 items-center gap-1',
                            index < crumbs.length - 2 && 'hidden sm:flex'
                        )}
                    >
                        {crumb.isLast ? (
                            <span className="truncate font-medium text-hud-ink">
                                {crumb.label}
                            </span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="truncate transition-colors hover:text-hud-ink"
                            >
                                {crumb.label}
                            </Link>
                        )}
                        {!crumb.isLast && (
                            <ChevronRight className="h-3 w-3 shrink-0 text-hud-line" />
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
