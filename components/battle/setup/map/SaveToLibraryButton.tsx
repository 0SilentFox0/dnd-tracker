'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LibraryBig } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useSaveMapToLibrary } from '@/lib/hooks/battle-maps';
import type { BattleMapEditor } from '@/lib/hooks/battles';
import { useNotify } from '@/lib/hooks/common';
import { errorMessage } from '@/lib/utils/common/error-message';

export function SaveToLibraryButton({
    campaignId,
    editor,
}: {
    campaignId: string;
    editor: BattleMapEditor;
}) {
    const t = useTranslations('battleSetup.map.saveToLibrary');

    const notify = useNotify();

    const library = useSaveMapToLibrary(campaignId);

    const [open, setOpen] = useState(false);

    const [name, setName] = useState('');

    const [error, setError] = useState<string | null>(null);

    const { value } = editor.state;

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (!value || !name.trim() || library.isPending) return;

        setError(null);

        try {
            await library.save(value, name);
        } catch (err) {
            return setError(errorMessage(err, t('failed')));
        }

        setOpen(false);
        setName('');

        void notify(
            <span>
                {t('saved')}{' '}
                <Link
                    href={`/campaigns/${campaignId}/dm/maps`}
                    className="underline"
                >
                    {t('open')}
                </Link>
            </span>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!value}
                onClick={() => setOpen(true)}
            >
                <LibraryBig aria-hidden="true" className="mr-2 h-4 w-4" />
                {t('button')}
            </Button>
            <ResponsiveDialog
                open={open}
                onOpenChange={setOpen}
                title={t('title')}
                description={t('description')}
                footer={
                    <Button
                        type="submit"
                        form="save-map-to-library"
                        disabled={!name.trim() || library.isPending}
                    >
                        {library.isPending ? t('saving') : t('submit')}
                    </Button>
                }
            >
                <form
                    id="save-map-to-library"
                    onSubmit={onSubmit}
                    className="space-y-2"
                >
                    <Label htmlFor="save-map-name">{t('name')}</Label>
                    <Input
                        id="save-map-name"
                        value={name}
                        maxLength={80}
                        autoFocus
                        onChange={(e) => setName(e.target.value)}
                    />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </form>
            </ResponsiveDialog>
        </>
    );
}
