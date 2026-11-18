'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function OrderButtons({
    labels,
    onMove,
    onRemove,
}: {
    labels: { up: string; down: string; remove: string };
    onMove: (dir: -1 | 1) => void;
    onRemove: () => void;
}) {
    return (
        <>
            <Button
                variant="bare"
                type="button"
                className="toggle"
                aria-label={labels.up}
                onClick={() => onMove(-1)}
            >
                <ArrowUp className="size-4" />
            </Button>
            <Button
                variant="bare"
                type="button"
                className="toggle"
                aria-label={labels.down}
                onClick={() => onMove(1)}
            >
                <ArrowDown className="size-4" />
            </Button>
            <Button
                variant="bare"
                type="button"
                className="toggle"
                aria-label={labels.remove}
                onClick={onRemove}
            >
                <Trash2 className="size-4" />
            </Button>
        </>
    );
}
