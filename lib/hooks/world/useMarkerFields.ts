'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCommittedName } from './useCommittedName';
import { useRemoveMarker } from './useRemoveMarker';
import type { useWorldEditor } from './useWorldEditor';

import { DEFAULT_ZONE_COLOR } from '@/lib/constants/world';
import type { UpdateWorldMarkerData, WorldMarker } from '@/types/world';

const COLOR_DEBOUNCE_MS = 400;

interface Options {
    marker: WorldMarker;
    editor: ReturnType<typeof useWorldEditor>;
    select(id: string | null): void;
}

export function useMarkerFields({ marker, editor, select }: Options) {
    const [note, setNote] = useState(marker.dmNote ?? '');

    const [color, setColor] = useState(marker.color ?? DEFAULT_ZONE_COLOR);

    const colorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

    const pendingColor = useRef<string | null>(null);

    const savedNote = useRef(marker.dmNote ?? '');

    const [description, setDescription] = useState(marker.description ?? '');

    const savedDescription = useRef(marker.description ?? '');

    const save = (data: UpdateWorldMarkerData) =>
        editor.marker.update.mutateOk({ id: marker.id, data });

    const { name, setName, commitName } = useCommittedName(
        marker.name,
        (next) => save({ name: next })
    );

    const saveRef = useRef(save);

    useEffect(() => {
        saveRef.current = save;
    });

    const flushColor = useCallback(() => {
        clearTimeout(colorTimer.current);

        if (pendingColor.current === null) return;

        const next = pendingColor.current;

        pendingColor.current = null;
        void saveRef.current({ color: next });
    }, []);

    useEffect(() => flushColor, [flushColor]);

    const commitNote = () => {
        const next = note.trim();

        if (next === savedNote.current) return;

        savedNote.current = next;
        void save({ dmNote: next || null });
    };

    const commitDescription = () => {
        const next = description.trim();

        if (next === savedDescription.current) return;

        savedDescription.current = next;
        void save({ description: next || null });
    };

    const pickColor = (c: string) => {
        setColor(c);
        clearTimeout(colorTimer.current);
        pendingColor.current = c;
        colorTimer.current = setTimeout(flushColor, COLOR_DEBOUNCE_MS);
    };

    const remove = useRemoveMarker({ marker, editor, select });

    return {
        name,
        setName,
        commitName,
        note,
        setNote,
        commitNote,
        description,
        setDescription,
        commitDescription,
        color,
        pickColor,
        save,
        remove,
    };
}
