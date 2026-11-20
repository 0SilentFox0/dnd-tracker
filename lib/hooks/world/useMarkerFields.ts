'use client';

import { useRef, useState } from 'react';

import { useCommittedName } from './useCommittedName';
import { useRemoveMarker } from './useRemoveMarker';
import type { useWorldEditor } from './useWorldEditor';

import { DEFAULT_ZONE_COLOR } from '@/lib/constants/world';
import { useDebouncedCommit } from '@/lib/hooks/common';
import type { UpdateWorldMarkerData, WorldMarker } from '@/types/world';

interface Options {
    marker: WorldMarker;
    editor: ReturnType<typeof useWorldEditor>;
    select(id: string | null): void;
}

export function useMarkerFields({ marker, editor, select }: Options) {
    const [note, setNote] = useState(marker.dmNote ?? '');

    const [color, setColor] = useState<string | null>(marker.color);

    const savedNote = useRef(marker.dmNote ?? '');

    const [description, setDescription] = useState(marker.description ?? '');

    const savedDescription = useRef(marker.description ?? '');

    const save = (data: UpdateWorldMarkerData) =>
        editor.marker.update.mutateOk({ id: marker.id, data });

    const { name, setName, commitName } = useCommittedName(
        marker.name,
        (next) => save({ name: next })
    );

    const colorCommit = useDebouncedCommit((value: string | null) =>
        save({ color: value })
    );

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

    const pickColor = (c: string | null) => {
        setColor(c);
        colorCommit.schedule(c);
    };

    const setLayer = (layerId: string) =>
        save({ layerId: layerId || null });

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
        colorValue: color ?? DEFAULT_ZONE_COLOR,
        isCustomColor:
            !!color && color.toLowerCase() !== DEFAULT_ZONE_COLOR,
        pickColor,
        resetColor: () => pickColor(null),
        save,
        setLayer,
        remove,
    };
}
