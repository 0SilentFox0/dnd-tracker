'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';

import { DetailSection } from './DetailParts';

import { HudIconButton } from '@/components/hud';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface AppearanceBlockProps {
    text: string | null;
    canEdit: boolean;
    onSave: (text: string) => Promise<unknown>;
    kind?: 'spell' | 'skill';
}

export function AppearanceBlock({
    text,
    canEdit,
    onSave,
    kind = 'spell',
}: AppearanceBlockProps) {
    const t = useTranslations('dashboard.reference');

    const tc = useTranslations('common.actions');

    const [editing, setEditing] = useState(false);

    const [draft, setDraft] = useState('');

    const [saving, setSaving] = useState(false);

    if (!canEdit && !text?.trim()) return null;

    const title =
        kind === 'skill'
            ? t('card.appearanceSkill')
            : t('card.appearanceSpell');

    const submit = async () => {
        setSaving(true);

        try {
            await onSave(draft);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <DetailSection
            title={
                <span className="flex items-center gap-1.5">
                    {title}
                    {canEdit && !editing && (
                        <HudIconButton
                            aria-label={t('detail.edit')}
                            onClick={() => {
                                setDraft(text ?? '');
                                setEditing(true);
                            }}
                        >
                            <Pencil className="size-3.5" />
                        </HudIconButton>
                    )}
                </span>
            }
        >
            {editing ? (
                <div className="space-y-2">
                    <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={t(
                            kind === 'skill'
                                ? 'card.appearancePlaceholderSkill'
                                : 'card.appearancePlaceholderSpell'
                        )}
                        rows={3}
                        className="min-h-[80px] text-sm"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            disabled={saving}
                            onClick={submit}
                            className="min-h-9 touch-manipulation"
                        >
                            {saving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                tc('save')
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={saving}
                            onClick={() => setEditing(false)}
                            className="min-h-9 touch-manipulation"
                        >
                            {tc('cancel')}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="whitespace-pre-line">{text?.trim() || '—'}</p>
            )}
        </DetailSection>
    );
}
