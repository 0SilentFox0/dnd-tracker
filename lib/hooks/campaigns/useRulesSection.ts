'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useMediaQuery } from '@/lib/hooks/common';

/** Open section from `?section=`: replace on wide screens, push on phones so "back" returns to the contents */
export function useRulesSection(keys: readonly string[]) {
    const router = useRouter();

    const pathname = usePathname();

    const params = useSearchParams();

    const wide = useMediaQuery('(min-width: 1024px)');

    const param = params.get('section');

    const fromUrl = param && keys.includes(param) ? param : null;

    const active = fromUrl ?? (wide ? (keys[0] ?? null) : null);

    const select = (key: string | null) => {
        const url = key ? `${pathname}?section=${key}` : pathname;

        if (wide) router.replace(url, { scroll: false });
        else router.push(url, { scroll: false });
    };

    return { active, select };
}
