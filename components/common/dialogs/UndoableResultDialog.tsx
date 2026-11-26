'use client';

import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useConfirm } from '@/lib/hooks/common';

export interface UndoableResultDialogLabels {
    button: string;
    title: string;
    submit: string;
    result: string;
    undo: string;
    undone: string;
    undoConfirm: string;
}

export function UndoableResultDialog({
    labels,
    result,
    submit,
    undo,
    onClosed,
    children,
}: {
    labels: UndoableResultDialogLabels;
    result: ReactNode | null;
    submit: { onClick: () => void; disabled: boolean };
    undo: {
        onConfirm: () => Promise<void>;
        pending: boolean;
        done: boolean;
        hidden?: boolean;
    };
    onClosed?: () => void;
    children: ReactNode;
}) {
    const confirm = useConfirm();

    const [open, setOpen] = useState(false);

    const onOpenChange = (o: boolean) => {
        setOpen(o);

        if (!o) onClosed?.();
    };

    const revert = () =>
        confirm({
            title: labels.undo,
            description: labels.undoConfirm,
            confirmLabel: labels.undo,
            onConfirm: undo.onConfirm,
        });

    return (
        <>
            <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(true)}
            >
                {labels.button}
            </Button>
            <ResponsiveDialog
                hud
                open={open}
                onOpenChange={onOpenChange}
                title={labels.title}
                footer={
                    result ? (
                        undo.hidden ? null : (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={undo.done || undo.pending}
                                onClick={revert}
                            >
                                {undo.done ? labels.undone : labels.undo}
                            </Button>
                        )
                    ) : (
                        <Button
                            type="button"
                            disabled={submit.disabled}
                            onClick={submit.onClick}
                        >
                            {labels.submit}
                        </Button>
                    )
                }
            >
                <div className="space-y-3">
                    {result ? (
                        <>
                            <h3 className="hud-sc text-sm text-hud-ink">
                                {labels.result}
                            </h3>
                            {result}
                        </>
                    ) : (
                        children
                    )}
                </div>
            </ResponsiveDialog>
        </>
    );
}
