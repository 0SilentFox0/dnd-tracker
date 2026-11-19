'use client';

import { useTranslations } from 'next-intl';

import { SearchInput } from '@/components/common/fields/SearchInput';
import { SearchEmptyState } from '@/components/common/states/SearchEmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { useSearch } from '@/lib/hooks/common';
import type { IdName } from '@/types/common';

export interface CopySelection {
    itemIds: string[];
    campaignIds: string[];
    all: boolean;
}

interface PickStepProps {
    items: IdName[];
    campaigns: IdName[];
    selection: CopySelection;
    onChange: (selection: CopySelection) => void;
}

const nameFields = (item: IdName) => [item.name];

const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function PickStep({
    items,
    campaigns,
    selection,
    onChange,
}: PickStepProps) {
    const t = useTranslations('contentCopy.pick');

    const search = useSearch(items, nameFields);

    const visibleIds = search.items.map((i) => i.id);

    const allVisible =
        visibleIds.length > 0 &&
        visibleIds.every((id) => selection.itemIds.includes(id));

    const toggleVisible = () =>
        onChange({
            ...selection,
            itemIds: allVisible
                ? selection.itemIds.filter((id) => !visibleIds.includes(id))
                : [...new Set([...selection.itemIds, ...visibleIds])],
        });

    return (
        <div className="space-y-5">
            <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t('itemsTitle')}</h3>
                <SearchInput
                    value={search.query.value}
                    onChange={search.query.set}
                    label={t('search')}
                />
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                        checked={allVisible}
                        onCheckedChange={toggleVisible}
                    />
                    {t('selectAll')}
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {search.items.map((item) => (
                        <li key={item.id}>
                            <label className="flex items-center gap-2 py-1 text-sm">
                                <Checkbox
                                    checked={selection.itemIds.includes(
                                        item.id
                                    )}
                                    onCheckedChange={() =>
                                        onChange({
                                            ...selection,
                                            itemIds: toggle(
                                                selection.itemIds,
                                                item.id
                                            ),
                                        })
                                    }
                                />
                                {item.name}
                            </label>
                        </li>
                    ))}
                </ul>
                {search.isActive && search.items.length === 0 && (
                    <SearchEmptyState
                        query={search.query.value}
                        onClear={() => search.query.set('')}
                    />
                )}
            </section>
            <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t('campaignsTitle')}</h3>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                        checked={selection.all}
                        onCheckedChange={(v) =>
                            onChange({ ...selection, all: v === true })
                        }
                    />
                    {t('allCampaigns')}
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {campaigns.map((campaign) => (
                        <li key={campaign.id}>
                            <label className="flex items-center gap-2 py-1 text-sm">
                                <Checkbox
                                    disabled={selection.all}
                                    checked={
                                        selection.all ||
                                        selection.campaignIds.includes(
                                            campaign.id
                                        )
                                    }
                                    onCheckedChange={() =>
                                        onChange({
                                            ...selection,
                                            campaignIds: toggle(
                                                selection.campaignIds,
                                                campaign.id
                                            ),
                                        })
                                    }
                                />
                                {campaign.name}
                            </label>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
