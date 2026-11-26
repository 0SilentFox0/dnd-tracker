'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useIsMobile } from '@/lib/hooks/common';
import type { SectionTab } from '@/types/info-reference';

export type RefKey = `${'spell' | 'skill' | 'artifact' | 'class'}:${string}`;

const SECTIONS: readonly SectionTab[] = [
    'all',
    'skills',
    'spells',
    'artifacts',
    'classes',
];

interface Options {
    visible: RefKey[];
    section: { value: SectionTab; set: (s: SectionTab) => void };
    autoSelect: boolean;
}

export function useReferenceSelection({
    visible,
    section,
    autoSelect,
}: Options) {
    const router = useRouter();

    const pathname = usePathname();

    const params = useSearchParams();

    const isMobile = useIsMobile();

    const pushed = useRef(false);

    const urlKey = params.get('e');

    const urlSection = params.get('s');

    useEffect(() => {
        const s = SECTIONS.find((v) => v === urlSection);

        if (s && s !== section.value) section.set(s);
        // initial URL only
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const urlFor = (key: RefKey | null) => {
        const next = new URLSearchParams(params.toString());

        next.set('s', section.value);

        if (key) next.set('e', key);
        else next.delete('e');

        return `${pathname}?${next.toString()}`;
    };

    const fromUrl = visible.find((k) => k === urlKey) ?? null;

    const selected = fromUrl ?? (autoSelect ? (visible[0] ?? null) : null);

    const select = (key: RefKey) => {
        if (isMobile) {
            pushed.current = true;
            router.push(urlFor(key), { scroll: false });
        } else {
            router.replace(urlFor(key), { scroll: false });
        }
    };

    const clear = () => {
        if (pushed.current) {
            pushed.current = false;
            router.back();
        } else {
            router.replace(urlFor(null), { scroll: false });
        }
    };

    return { selected, select, clear, isOpen: fromUrl !== null };
}
