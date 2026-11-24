'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SelectField } from '@/components/ui/select-field';
import { SwitchField } from '@/components/ui/switch-field';
import { Textarea } from '@/components/ui/textarea';
import { MarkerPickerDialog } from '@/components/world/nav/MarkerPickerDialog';
import { useConfirm } from '@/lib/hooks/common';
import { useQuestActions } from '@/lib/hooks/quests';
import type { QuestInput, QuestView } from '@/types/quests';

export function QuestEditor({
    campaignId,
    quest,
    onClose,
}: {
    campaignId: string;
    quest?: QuestView;
    onClose(): void;
}) {
    const t = useTranslations('quests');

    const confirm = useConfirm();

    const actions = useQuestActions(campaignId);

    const [picker, setPicker] = useState(false);

    const [data, setData] = useState<QuestInput>(() => ({
        title: quest?.title ?? '',
        description: quest?.description ?? '',
        kind: quest?.kind ?? 'main',
        status: quest?.status ?? 'active',
        visible: quest?.visible ?? false,
        notes: quest?.notes ?? '',
        reward: quest?.reward ?? '',
        markerId: quest?.marker?.id ?? null,
        objectives:
            quest?.objectives.flatMap((o) =>
                o.hidden
                    ? []
                    : [
                          {
                              title: o.title,
                              completed: o.completed,
                              visible: o.visible,
                          },
                      ]
            ) ?? [],
    }));

    const pending = actions.save.isPending || actions.remove.isPending;

    const set = <K extends keyof QuestInput>(key: K, value: QuestInput[K]) =>
        setData((d) => ({ ...d, [key]: value }));

    const objective = (
        index: number,
        patch: Partial<QuestInput['objectives'][number]>
    ) =>
        set(
            'objectives',
            data.objectives.map((o, i) =>
                i === index ? { ...o, ...patch } : o
            )
        );

    return (
        <>
            <ResponsiveDialog
                open
                onOpenChange={(open) => {
                    if (!open && !pending) onClose();
                }}
                title={t(quest ? 'edit' : 'new')}
                hud
                size="lg"
                footer={
                    <>
                        <Button
                            variant="outline"
                            disabled={pending}
                            onClick={onClose}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            type="submit"
                            form="quest-editor"
                            disabled={pending}
                        >
                            {t('save')}
                        </Button>
                    </>
                }
            >
                <form
                    id="quest-editor"
                    className="space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        try {
                            await actions.save.mutateAsync({
                                data,
                                id: quest?.id,
                            });
                            onClose();
                        } catch {}
                    }}
                >
                    {(actions.save.error || actions.remove.error) && (
                        <ErrorState
                            error={actions.save.error || actions.remove.error}
                        />
                    )}
                    <Label htmlFor="quest-title">{t('name')}</Label>
                    <Input
                        id="quest-title"
                        required
                        maxLength={200}
                        value={data.title}
                        onChange={(e) => set('title', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        {(['kind', 'status'] as const).map((field) => (
                            <div key={field} className="space-y-2">
                                <Label htmlFor={`quest-${field}`}>
                                    {t(field)}
                                </Label>
                                <SelectField
                                    id={`quest-${field}`}
                                    value={data[field]}
                                    options={(field === 'kind'
                                        ? (['main', 'side'] as const)
                                        : ([
                                              'active',
                                              'completed',
                                              'failed',
                                          ] as const)
                                    ).map((value) => ({
                                        value,
                                        label: t(value),
                                    }))}
                                    onValueChange={(value) =>
                                        field === 'kind'
                                            ? set(
                                                  'kind',
                                                  value as QuestInput['kind']
                                              )
                                            : set(
                                                  'status',
                                                  value as QuestInput['status']
                                              )
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <SwitchField
                        id="quest-visible"
                        label={t('visible')}
                        checked={data.visible}
                        onCheckedChange={(value) => set('visible', value)}
                    />
                    {(['description', 'notes', 'reward'] as const).map(
                        (field) => (
                            <div key={field} className="space-y-2">
                                <Label htmlFor={`quest-${field}`}>
                                    {t(field)}
                                </Label>
                                <Textarea
                                    id={`quest-${field}`}
                                    maxLength={
                                        field === 'reward' ? 2000 : 10000
                                    }
                                    value={data[field]}
                                    onChange={(e) => set(field, e.target.value)}
                                />
                            </div>
                        )
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPicker(true)}
                        >
                            {t('pickMarker')}
                        </Button>
                        {data.markerId && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => set('markerId', null)}
                            >
                                {t('clearMarker')}
                            </Button>
                        )}
                    </div>
                    <h3 className="hud-sc text-hud-gold">{t('objectives')}</h3>
                    {data.objectives.map((o, index) => (
                        <div
                            key={index}
                            className="space-y-2 rounded border border-hud-line p-3"
                        >
                            <Input
                                aria-label={`${t('objective')} ${index + 1}`}
                                required
                                maxLength={500}
                                value={o.title}
                                onChange={(e) =>
                                    objective(index, { title: e.target.value })
                                }
                            />
                            <div className="flex flex-wrap gap-3">
                                <SwitchField
                                    id={`objective-visible-${index}`}
                                    label={t('visible')}
                                    checked={o.visible}
                                    onCheckedChange={(visible) =>
                                        objective(index, { visible })
                                    }
                                />
                                <SwitchField
                                    id={`objective-done-${index}`}
                                    label={t('done')}
                                    checked={o.completed}
                                    onCheckedChange={(completed) =>
                                        objective(index, { completed })
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                        set(
                                            'objectives',
                                            data.objectives.filter(
                                                (_, i) => i !== index
                                            )
                                        )
                                    }
                                >
                                    {t('remove')}
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        disabled={data.objectives.length >= 100}
                        onClick={() =>
                            set('objectives', [
                                ...data.objectives,
                                { title: '', visible: false, completed: false },
                            ])
                        }
                    >
                        {t('addObjective')}
                    </Button>
                    {quest && (
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={pending}
                            onClick={async () => {
                                if (
                                    await confirm({
                                        title: t('deleteConfirm'),
                                        destructive: true,
                                        onConfirm: () =>
                                            actions.remove.mutateAsync(
                                                quest.id
                                            ),
                                    })
                                )
                                    onClose();
                            }}
                        >
                            {t('delete')}
                        </Button>
                    )}
                </form>
            </ResponsiveDialog>
            <MarkerPickerDialog
                campaignId={campaignId}
                open={picker}
                onOpenChange={setPicker}
                onPick={(ref) => {
                    set('markerId', ref.markerId);
                    setPicker(false);
                }}
            />
        </>
    );
}
