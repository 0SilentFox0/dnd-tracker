'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';

import { RequirementList } from '@/components/choices/RequirementList';
import { EntityIcon } from '@/components/common/EntityIcon';
import { MarkdownLite } from '@/components/common/MarkdownLite';
import { OptionButton } from '@/components/hud/OptionButton';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';
import type { Requirement } from '@/lib/utils/characters/choices/requirements';

interface DetailsButtonProps {
    title: string;
    text: string | (() => string);
    className?: string;
}

export function DetailsButton({ title, text, className }: DetailsButtonProps) {
    const t = useTranslations('choices');

    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                aria-label={t('picker.details')}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                }}
                className={cn(
                    'rounded p-1 text-hud-gold hover:bg-hud-line/20',
                    className
                )}
            >
                <Info className="size-4" aria-hidden="true" />
            </button>
            {open && (
                <ResponsiveDialog hud open onOpenChange={setOpen} title={title}>
                    <MarkdownLite
                        className="space-y-2 text-sm"
                        text={typeof text === 'function' ? text() : text}
                    />
                </ResponsiveDialog>
            )}
        </>
    );
}

interface ChoiceCardProps {
    control: {
        role: 'checkbox' | 'radio';
        checked: boolean;
        disabled?: boolean;
        onClick: () => void;
    };
    content: {
        title: string;
        name: string;
        icon?: string | null;
        summary: ReactNode;
        description?: string | (() => string);
        note?: string;
    };
    requirements?: {
        items?: Requirement[];
        names?: Record<string, string>;
    };
}

export function ChoiceCard({ control, content, requirements }: ChoiceCardProps) {
    const { role, checked, disabled, onClick } = control;

    const { title, name, icon, summary, description, note } = content;

    return (
        <div className="relative">
            <OptionButton
                variant="form"
                role={role}
                checked={checked}
                disabled={disabled}
                onClick={onClick}
                className={description ? 'pr-9' : undefined}
                title={
                    <span className="flex items-center gap-2">
                        <EntityIcon
                            src={icon}
                            name={name}
                            className="size-7 text-xs"
                        />
                        {title}
                    </span>
                }
                note={
                    (summary || note) && (
                        <>
                            {summary}
                            {note && (
                                <span className="block text-hud-danger">
                                    {note}
                                </span>
                            )}
                        </>
                    )
                }
            />
            {description && (
                <DetailsButton
                    title={name}
                    text={description}
                    className="absolute top-1 right-1"
                />
            )}
            <RequirementList items={requirements?.items} names={requirements?.names} />
        </div>
    );
}
