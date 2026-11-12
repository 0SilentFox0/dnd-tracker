'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { themeApi } from '@/lib/api/theme';
import { createClient } from '@/lib/supabase/client';
import {
    applyPalette,
    cachePalette,
    clearActivePalette,
    paletteStorageKey,
    readCachedPalette,
} from '@/lib/theme/client';
import {
    DEFAULT_PALETTE,
    isPaletteId,
    isPalettePath,
    paletteFor,
} from '@/lib/theme/palettes';
import type { PaletteId } from '@/types/theme';

function invalidateRevision(revision: { current: number }) {
    revision.current += 1;
}

export function usePaletteState(pathname: string) {
    const [palette, setCurrent] = useState<PaletteId>(DEFAULT_PALETTE);

    const [ready, setReady] = useState(false);

    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<'load' | 'save' | null>(null);

    const owner = useRef<string | null | undefined>(undefined);

    const revision = useRef(0);

    const writing = useRef(false);

    const enabled = isPalettePath(pathname);

    useEffect(() => {
        if (!enabled) {
            applyPalette(null);

            return;
        }

        // Preserve the early bootstrap until the signed-in account's cache is known.
        if (owner.current === undefined || !ready) return;

        applyPalette(owner.current ? palette : null);
    }, [enabled, palette, ready]);

    useEffect(() => {
        if (!enabled) return;

        let alive = true;

        let authEvent = false;

        const client = createClient();

        const sync = (userId: string | null) => {
            if (!alive || owner.current === userId) return;

            owner.current = userId;

            const version = ++revision.current;

            writing.current = false;
            setSaving(false);
            setError(null);
            setReady(!!userId);

            if (!userId) {
                clearActivePalette();
                applyPalette(null);
                setCurrent(DEFAULT_PALETTE);

                return;
            }

            const cached = readCachedPalette(userId);

            setCurrent(cached);
            cachePalette({ userId, palette: cached });
            void themeApi
                .get()
                .then((settings) => {
                    if (
                        !alive ||
                        version !== revision.current ||
                        settings.userId !== owner.current
                    )
                        return;

                    const next = paletteFor(settings.palette);

                    setCurrent(next);
                    cachePalette({ userId, palette: next });
                })
                .catch(() => {
                    if (alive && version === revision.current) setError('load');
                });
        };

        const {
            data: { subscription },
        } = client.auth.onAuthStateChange((_event, session) => {
            authEvent = true;
            sync(session?.user.id ?? null);
        });

        void client.auth
            .getSession()
            .then(({ data }) => {
                if (!authEvent) sync(data.session?.user.id ?? null);
            })
            .catch(() => {
                if (!authEvent) sync(null);
            });

        const onStorage = (event: StorageEvent) => {
            if (
                !owner.current ||
                writing.current ||
                event.key !== paletteStorageKey(owner.current) ||
                !isPaletteId(event.newValue)
            )
                return;

            invalidateRevision(revision);
            setCurrent(event.newValue);
            cachePalette({ userId: owner.current, palette: event.newValue });
        };

        window.addEventListener('storage', onStorage);

        return () => {
            alive = false;
            invalidateRevision(revision);
            owner.current = undefined;
            subscription.unsubscribe();
            window.removeEventListener('storage', onStorage);
        };
    }, [enabled]);

    const setPalette = useCallback(
        async (next: PaletteId) => {
            const userId = owner.current;

            if (!enabled || !userId || writing.current || !isPaletteId(next))
                return;

            const version = ++revision.current;

            const previous = palette;

            writing.current = true;
            setSaving(true);
            setError(null);
            setCurrent(next);
            try {
                const saved = await themeApi.set(next);

                if (version !== revision.current) return;

                if (saved.userId !== userId || saved.palette !== next)
                    throw new Error(
                        'Palette response does not match the active account'
                    );

                cachePalette({ userId, palette: next });
            } catch {
                if (version !== revision.current) return;

                setCurrent(previous);
                setError('save');
            } finally {
                if (version === revision.current) {
                    writing.current = false;
                    setSaving(false);
                }
            }
        },
        [enabled, palette]
    );

    return { palette, ready, saving, error, setPalette };
}
