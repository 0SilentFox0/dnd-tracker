'use client';

import { useTranslations } from 'next-intl';

import { HudButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { FormField, LabeledInput } from '@/components/ui/labeled-input';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    WORLD_SESSION_COLORS,
    WORLD_SESSION_DESCRIPTION_MAX,
    WORLD_SESSION_NAME_MAX,
} from '@/lib/constants/world';
import { useSessionForm } from '@/lib/hooks/world';
import { cn } from '@/lib/utils';
import type { WorldSession } from '@/types/world';

const FORM_ID = 'world-session-form';

interface Props {
    campaignId: string;
    open: boolean;
    onOpenChange(v: boolean): void;
    session?: WorldSession;
}

// the key remounts the form so every opening starts from a clean state
export function SessionFormDialog(props: Props) {
    return (
        <SessionFormDialogBody
            key={`${props.open}:${props.session?.id}`}
            {...props}
        />
    );
}

function SessionFormDialogBody({
    campaignId,
    open,
    onOpenChange,
    session,
}: Props) {
    const t = useTranslations('world.sessions');

    const tc = useTranslations('common.actions');

    const { fields, canSubmit, busy, submit } = useSessionForm({
        campaignId,
        session,
        onDone: () => onOpenChange(false),
    });

    return (
        <ResponsiveDialog
            hud
            open={open}
            onOpenChange={onOpenChange}
            title={session ? t('formEditTitle') : t('formNewTitle')}
            description={t('formDescription')}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {tc('cancel')}
                    </Button>
                    <Button type="submit" form={FORM_ID} disabled={!canSubmit}>
                        {session ? tc('save') : tc('create')}
                    </Button>
                </>
            }
        >
            <form
                id={FORM_ID}
                onSubmit={(e) => void submit(e)}
                className="space-y-3"
            >
                <LabeledInput
                    label={t('name')}
                    required
                    maxLength={WORLD_SESSION_NAME_MAX}
                    value={fields.name}
                    onChange={(e) => fields.setName(e.target.value)}
                />
                <FormField label={t('description')}>
                    <Textarea
                        aria-label={t('description')}
                        maxLength={WORLD_SESSION_DESCRIPTION_MAX}
                        rows={3}
                        value={fields.description}
                        onChange={(e) => fields.setDescription(e.target.value)}
                    />
                </FormField>
                <FormField label={t('color')}>
                    <div
                        role="radiogroup"
                        aria-label={t('color')}
                        className="flex flex-wrap gap-2"
                    >
                        {WORLD_SESSION_COLORS.map((c) => (
                            <HudButton
                                key={c}
                                type="button"
                                role="radio"
                                aria-checked={fields.color === c}
                                aria-label={t('colorOption', { color: c })}
                                className={cn(
                                    'size-7 rounded-full border-2 border-transparent',
                                    fields.color === c &&
                                        'ring-2 ring-offset-2 ring-offset-black'
                                )}
                                style={{ background: c }}
                                onClick={() => fields.setColor(c)}
                            />
                        ))}
                    </div>
                </FormField>
                {busy ? <span className="sr-only">{tc('saving')}</span> : null}
            </form>
        </ResponsiveDialog>
    );
}
