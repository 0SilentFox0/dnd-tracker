'use client';

import { type ComponentProps, forwardRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';

import { battleFormId } from './battle-form-tabs';
import { BattleFormBasicInfo, type SetupDetails } from './BattleFormBasicInfo';

import { HudButton } from '@/components/hud';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { useIsMobile } from '@/lib/hooks/common';
import { cn } from '@/lib/utils';

interface SetupHeaderProps {
    details: SetupDetails;
    campaignId: string;
    isEdit: boolean;
}

const DetailsButton = forwardRef<
    HTMLButtonElement,
    ComponentProps<typeof HudButton> & { filled: boolean }
>(({ filled, className, ...props }, ref) => {
    const t = useTranslations('battleSetup.form');

    return (
        <HudButton
            ref={ref}
            className={cn(
                'relative inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-hud-muted hover:text-hud-ink',
                className
            )}
            {...props}
        >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t('details.label')}
            {filled && (
                <span
                    data-testid="details-dot"
                    aria-hidden
                    className="size-1.5 rounded-full bg-hud-accent"
                />
            )}
        </HudButton>
    );
});

DetailsButton.displayName = 'DetailsButton';

function DetailsControl({ details }: { details: SetupDetails }) {
    const t = useTranslations('battleSetup.form');

    const isMobile = useIsMobile();

    const [open, setOpen] = useState(false);

    const { description, turnTimerSeconds } = details.data;

    const filled = description.trim() !== '' || turnTimerSeconds !== null;

    if (isMobile)
        return (
            <>
                <DetailsButton filled={filled} onClick={() => setOpen(true)} />
                <ResponsiveDialog
                    open={open}
                    onOpenChange={setOpen}
                    title={t('details.title')}
                    hud
                >
                    <BattleFormBasicInfo details={details} />
                </ResponsiveDialog>
            </>
        );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <DetailsButton filled={filled} />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 max-w-[90vw] p-4">
                <BattleFormBasicInfo details={details} />
            </PopoverContent>
        </Popover>
    );
}

export function SetupHeader({ details, campaignId, isEdit }: SetupHeaderProps) {
    const t = useTranslations('battleSetup.form');

    const tBasic = useTranslations('battleSetup.basic');

    const [touched, setTouched] = useState(false);

    const { name } = details.data;

    const invalid = touched && name.trim() === '';

    return (
        <div className="flex min-w-0 flex-col gap-2 px-4 pt-2 pb-3">
            <Link
                href={`/campaigns/${campaignId}/dm/battles`}
                className="ds-interactive inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-hud-muted hover:text-hud-ink"
            >
                <ArrowLeft className="size-4" aria-hidden />
                {t('backToList')}
            </Link>
            <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                    <Input
                        id="name"
                        form={battleFormId(isEdit)}
                        aria-label={tBasic('name')}
                        aria-invalid={invalid || undefined}
                        value={name}
                        required
                        placeholder={tBasic('namePlaceholder')}
                        onChange={(e) =>
                            details.set((prev) => ({
                                ...prev,
                                name: e.target.value,
                            }))
                        }
                        onBlur={() => setTouched(true)}
                        onInvalid={() => setTouched(true)}
                        className={cn(
                            'hud-sc h-auto rounded-none border-0 border-b border-hud-rule bg-transparent px-0 py-1 text-[22px] shadow-none focus-visible:border-hud-accent focus-visible:ring-0',
                            invalid && 'border-hud-crimson'
                        )}
                    />
                    {invalid && (
                        <p
                            role="alert"
                            className="mt-1 text-xs text-hud-crimson-fg"
                        >
                            {t('nameRequired')}
                        </p>
                    )}
                </div>
                <DetailsControl details={details} />
            </div>
        </div>
    );
}
