'use client';

import { useTranslations } from 'next-intl';

import { HudPanel } from '@/components/hud/page';
import type { Row } from '@/types/admin';

export function BreakdownTable({
    title,
    rows,
}: {
    title: string;
    rows: Row[];
}) {
    const t = useTranslations('admin');

    return (
        <HudPanel className="space-y-2">
            <h3 className="hud-sc text-sm">{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-hud-muted">
                            <th className="py-1 pr-3 font-normal">
                                {t('overview.breakdowns.key')}
                            </th>
                            <th className="py-1 font-normal">
                                {t('overview.breakdowns.users')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.key}
                                className="border-t border-hud-line"
                            >
                                <td className="py-1 pr-3">
                                    {r.key === 'none'
                                        ? t('common.none')
                                        : r.key}
                                </td>
                                <td className="py-1">{r.n}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </HudPanel>
    );
}
