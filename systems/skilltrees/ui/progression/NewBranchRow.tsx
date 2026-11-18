import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export function NewBranchRow({
    count,
    onSelect,
}: {
    count: number;
    onSelect: () => void;
}) {
    const t = useTranslations('skillTree.progression');

    return (
        <Button
            type="button"
            variant="ghost"
            onClick={onSelect}
            className="flex h-auto w-full items-center justify-start gap-3 rounded-none p-0 px-4 py-2 text-left font-normal whitespace-normal hover:bg-transparent dark:hover:bg-transparent"
        >
            <span className="branch-frame new hud-sc text-2xl">?</span>
            <span className="text-sm text-hud-soft italic">
                {t('newBranch', { count })}
            </span>
        </Button>
    );
}
