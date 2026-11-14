'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { BoundedNumberInput } from '@/components/ui/bounded-number-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { DEFAULT_BATTLE_MAP } from '@/lib/constants/battle';
import type { NewMapForm } from '@/lib/hooks/battle-maps';
import { MAX_SIDE, MIN_SIDE } from '@/lib/utils/battle/grid';

const FORM_ID = 'create-map-form';

export function CreateMapDialog({
    open,
    onOpenChange,
    pending,
    onSubmit,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pending: boolean;
    onSubmit: (form: NewMapForm) => void;
}) {
    const t = useTranslations('maps.create');

    const tActions = useTranslations('common.actions');

    const [name, setName] = useState('');

    const [size, setSize] = useState({
        cols: DEFAULT_BATTLE_MAP.cols as number,
        rows: DEFAULT_BATTLE_MAP.rows as number,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({ name: name.trim(), ...size });
    };

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('title')}
            description={t('description')}
            hud
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {tActions('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        form={FORM_ID}
                        disabled={!name.trim() || pending}
                    >
                        {t('submit')}
                    </Button>
                </>
            }
        >
            <form id={FORM_ID} onSubmit={submit} className="space-y-3">
                <div className="space-y-2">
                    <Label htmlFor="create-map-name">{t('name')}</Label>
                    <Input
                        id="create-map-name"
                        value={name}
                        maxLength={80}
                        required
                        placeholder={t('namePlaceholder')}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="create-map-cols">{t('cols')}</Label>
                        <BoundedNumberInput
                            id="create-map-cols"
                            value={size.cols}
                            min={MIN_SIDE}
                            max={MAX_SIDE}
                            onCommit={(cols) =>
                                setSize((s) => ({ ...s, cols }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-map-rows">{t('rows')}</Label>
                        <BoundedNumberInput
                            id="create-map-rows"
                            value={size.rows}
                            min={MIN_SIDE}
                            max={MAX_SIDE}
                            onCommit={(rows) =>
                                setSize((s) => ({ ...s, rows }))
                            }
                        />
                    </div>
                </div>
            </form>
        </ResponsiveDialog>
    );
}
