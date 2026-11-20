'use client';

import { useTranslations } from 'next-intl';

import { ColorSwatch } from '@/components/common/fields/ColorSwatch';
import { Button } from '@/components/ui/button';

interface MarkerColorFieldProps {
    label: string;
    color: string;
    isCustom: boolean;
    onPick(color: string): void;
    onReset(): void;
}

export function MarkerColorField({
    label,
    color,
    isCustom,
    onPick,
    onReset,
}: MarkerColorFieldProps) {
    const t = useTranslations('world.editor');

    return (
        <>
            <ColorSwatch color={color} label={label} onChange={onPick} />
            {label}
            {isCustom ? (
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onReset}
                >
                    {t('colorDefault')}
                </Button>
            ) : null}
        </>
    );
}
