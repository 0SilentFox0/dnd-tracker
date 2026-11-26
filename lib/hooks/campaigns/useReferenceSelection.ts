'use client';

import { useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DESKTOP_QUERY, useMediaQuery } from '@/lib/hooks/common';

export type ReferenceKind = 'spell' | 'skill' | 'artifact' | 'class';

export interface ReferenceRef {
    kind: ReferenceKind;
    id: string;
}

const PARAM = 'e';

const KINDS: readonly string[] = ['spell', 'skill', 'artifact', 'class'];

export function parseReferenceRef(raw: string | null): ReferenceRef | null {
    if (!raw) return null;

    const at = raw.indexOf(':');

    const kind = raw.slice(0, at);

    const id = raw.slice(at + 1);

    return at > 0 && id && KINDS.includes(kind)
        ? { kind: kind as ReferenceKind, id }
        : null;
}

const same = (a: ReferenceRef, b: ReferenceRef) =>
    a.kind === b.kind && a.id === b.id;

export function useReferenceSelection(
    visible: readonly ReferenceRef[],
    opts: { autoSelect: boolean }
) {
    const router = useRouter();

    const pathname = usePathname();

    const params = useSearchParams();

    const isDesktop = useMediaQuery(DESKTOP_QUERY, true);

    const pushed = useRef(false);

    const explicit = parseReferenceRef(params.get(PARAM));

    const explicitVisible =
        explicit && visible.some((ref) => same(ref, explicit))
            ? explicit
            : null;

    const selected =
        explicitVisible ?? (opts.autoSelect ? (visible[0] ?? null) : null);

    const write = useCallback(
        (ref: ReferenceRef | null, mode: 'push' | 'replace') => {
            const next = new URLSearchParams(params.toString());

            if (ref) next.set(PARAM, `${ref.kind}:${ref.id}`);
            else next.delete(PARAM);

            const query = next.toString();

            router[mode](query ? `${pathname}?${query}` : pathname, {
                scroll: false,
            });
        },
        [params, pathname, router]
    );

    const select = useCallback(
        (ref: ReferenceRef) => {
            const push = !isDesktop && !explicit;

            pushed.current = push;
            write(ref, push ? 'push' : 'replace');
        },
        [explicit, isDesktop, write]
    );

    const clear = useCallback(() => {
        if (pushed.current) {
            pushed.current = false;
            router.back();

            return;
        }

        write(null, 'replace');
    }, [router, write]);

    return { selected, select, clear, isOpen: explicitVisible !== null };
}
