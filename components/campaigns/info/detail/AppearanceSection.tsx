'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';

import { DetailSection } from './ReferenceDetailShell';

import { HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface AppearanceController {
    draft: { data: string; set: (value: string) => void };
    status: { isSaving: boolean };
    save: () => void;
}

export function AppearanceSection({
    title,
    placeholder,
    saveLabel,
    controller,
    isDM,
}: {
    title: string;
    placeholder: string;
    saveLabel: string;
    controller: AppearanceController;
    isDM: boolean;
}) {
    const t = useTranslations('common.actions');

    const {
        draft: { data, set },
        status: { isSaving },
        save,
    } = controller;

    const [editing, setEditing] = useState(false);

    const committed = useRef(data);

    const onSave = () => {
        committed.current = data;
        save();
        setEditing(false);
    };

    const onCancel = () => {
        set(committed.current);
        setEditing(false);
    };

    return (
        <DetailSection
            title={title}
            action={
                isDM && !editing ? (
                    <HudIconButton
                        tone="muted"
                        aria-label={t('edit')}
                        onClick={() => setEditing(true)}
                    >
                        <Pencil className="size-4" aria-hidden />
                    </HudIconButton>
                ) : null
            }
        >
            {isDM && editing ? (
                <div className="space-y-2">
                    <Textarea
                        value={data}
                        onChange={(e) => set(e.target.value)}
                        placeholder={placeholder}
                        rows={3}
                        className="min-h-20 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            disabled={isSaving}
                            onClick={onSave}
                            className="min-h-9 touch-manipulation"
                        >
                            {isSaving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                saveLabel
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onCancel}
                            className="min-h-9 touch-manipulation"
                        >
                            {t('cancel')}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="whitespace-pre-line">{data.trim() || '—'}</p>
            )}
        </DetailSection>
    );
}
