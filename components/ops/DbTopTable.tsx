'use client';

import { useTranslations } from 'next-intl';

import type { OpsDbTop } from '@/types/ops';

export function DbTopTable({ data }: { data: OpsDbTop }) {
    const t = useTranslations('ops.slow');

    return (
        <section aria-labelledby="ops-slow" className="space-y-4">
            <h2 id="ops-slow" className="text-lg font-semibold">
                {t('title')}
            </h2>
            <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('statements')}</h3>
                {!data.available ? (
                    <p className="text-sm text-muted-foreground">
                        {t('unavailable')}
                    </p>
                ) : data.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('empty')}
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-3 py-2">{t('query')}</th>
                                    <th className="px-3 py-2 text-right">
                                        {t('calls')}
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        {t('total')}
                                    </th>
                                    <th className="px-3 py-2 text-right">
                                        {t('mean')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.rows.map((r, i) => (
                                    <tr key={i}>
                                        <td
                                            className="max-w-[18rem] truncate px-3 py-2 font-mono sm:max-w-xl"
                                            title={r.query}
                                        >
                                            {r.query}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {r.calls}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {r.totalMs}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                            {r.meanMs}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-medium">{t('longTx')}</h3>
                {data.longTx.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {t('noLongTx')}
                    </p>
                ) : (
                    <ul className="text-sm">
                        {data.longTx.map((tx, i) => (
                            <li key={i}>
                                {t('txRow', {
                                    seconds: tx.seconds,
                                    state: tx.state,
                                })}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
