'use client';

import { type FormEvent, useState } from 'react';

import { useWorldSessions } from './useWorldSessions';

import { WORLD_SESSION_COLORS } from '@/lib/constants/world';
import type { WorldSession } from '@/types/world';

interface Args {
    campaignId: string;
    session?: WorldSession;
    onDone(): void;
}

export function useSessionForm({ campaignId, session, onDone }: Args) {
    const { list, start, update } = useWorldSessions(campaignId);

    const [name, setName] = useState(session?.name ?? '');

    const [description, setDescription] = useState(session?.description ?? '');

    const [color, setColor] = useState(
        session?.color ??
            WORLD_SESSION_COLORS[
                (list.data?.length ?? 0) % WORLD_SESSION_COLORS.length
            ]
    );

    const busy = start.isPending || update.isPending;

    const canSubmit = name.trim().length > 0 && !busy;

    const submit = async (e: FormEvent) => {
        e.preventDefault();

        if (!canSubmit) return;

        const data = {
            name: name.trim(),
            description: description.trim() || undefined,
            color,
        };

        const ok = session
            ? await update.mutateOk({ id: session.id, data })
            : await start.mutateOk(data);

        if (ok) onDone();
    };

    return {
        fields: { name, description, color, setName, setDescription, setColor },
        canSubmit,
        busy,
        submit,
    };
}
