import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { RulesSectionGroup } from '@/lib/utils/rules/sections';

export interface RulesTocItem {
    key: string;
    label: string;
    description: string;
    changed: boolean;
}

export interface RulesTocGroup {
    id: RulesSectionGroup | 'other';
    items: RulesTocItem[];
}

export function RulesToc({
    groups,
    query,
}: {
    groups: RulesTocGroup[];
    query: { value: string; set: (value: string) => void };
}) {
    const t = useTranslations('rules');

    return (
        <div className="space-y-3">
            <SearchInput
                value={query.value}
                onChange={query.set}
                label={t('page.filter')}
                placeholder={t('page.filter')}
            />
            <TabsList className="flex h-auto w-full flex-col items-stretch justify-start gap-0.5 rounded-none bg-transparent p-0">
                {groups.map((group) => (
                    <div
                        key={group.id}
                        role="presentation"
                        className="flex flex-col gap-0.5"
                    >
                        <p
                            role="presentation"
                            className="hud-sc mt-2 px-2 text-sm text-hud-muted"
                        >
                            {t(`page.groups.${group.id}`)}
                        </p>
                        {group.items.map((item) => (
                            <TabsTrigger
                                key={item.key}
                                value={item.key}
                                className={cn(
                                    'hud-sc h-auto min-h-10 justify-between gap-2 px-2 py-2 text-left text-[15px] whitespace-normal text-hud-muted hover:bg-hud-raised',
                                    'data-[state=active]:bg-transparent data-[state=active]:shadow-[inset_2px_0_0_var(--hud-accent)]',
                                    'max-lg:ds-panel max-lg:px-3'
                                )}
                            >
                                <span>{item.label}</span>
                                {item.changed && (
                                    <span
                                        data-changed-dot
                                        role="img"
                                        aria-label={t('page.changedBadge')}
                                        className="text-hud-accent-fg"
                                    >
                                        ●
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </div>
                ))}
            </TabsList>
        </div>
    );
}
