'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useIsCompact } from '@/lib/hooks/common';

const PARAM = 'section';

export function useRulesSection(keys: readonly string[]) {
    const router = useRouter();

    const pathname = usePathname();

    const params = useSearchParams();

    const isMobile = useIsCompact();

    const pushed = useRef(false);

    const fromUrl = (raw: string | null | undefined) =>
        keys.find((key) => key === raw) ?? null;

    const urlValue = params?.get(PARAM);

    const [section, setLocal] = useState(() => fromUrl(urlValue));

    useEffect(() => {
        setLocal(fromUrl(urlValue));
        // keys settle after the first render; re-resolve only when the URL moves
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [urlValue, keys.join(',')]);

    const urlFor = (key: string | null) => {
        const next = new URLSearchParams(params?.toString());

        if (key) next.set(PARAM, key);
        else next.delete(PARAM);

        const query = next.toString();

        return query ? `${pathname}?${query}` : (pathname ?? '');
    };

    const setSection = (key: string | null) => {
        setLocal(key);

        if (key === null && pushed.current) {
            pushed.current = false;
            router.back();

            return;
        }

        if (key && isMobile && section === null) {
            pushed.current = true;
            router.push(urlFor(key), { scroll: false });

            return;
        }

        router.replace(urlFor(key), { scroll: false });
    };

    return { section, setSection };
}
