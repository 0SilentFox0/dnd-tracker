'use client';

import { useTranslations } from 'next-intl';

import type { OpsDbTop } from '@/types/ops';

export function DbTopTable({ data }: { data: OpsDbTop }) {
    const t = useTranslations('ops.slow');

    return (
        <section aria-labelledby="ops-slow" className="space-y-4">
            <h2 id="ops-slow" className="hud-sc text-lg">
                {t('title')}
            </h2>
            <div className="space-y-2">
                <h3 className="hud-sc text-sm">{t('statements')}</h3>
                {!data.available ? (
                    <p className="text-base text-muted-foreground">
                        {t('unavailable')}
                    </p>
                ) : data.rows.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                        {t('empty')}
                    </p>
                ) : (
                    <div className="overflow-x-auto border-y border-[var(--hud-rule)]">
                        <table className="w-full text-left text-base">
                            <thead className="border-b border-[var(--hud-line)]">
                                <tr>
                                    <th className="px-3 py-2.5 text-sm font-medium text-hud-muted">
                                        {t('query')}
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-sm font-medium text-hud-muted">
                                        {t('calls')}
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-sm font-medium text-hud-muted">
                                        {t('total')}
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-sm font-medium text-hud-muted">
                                        {t('mean')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--hud-rule)]">
                                {data.rows.map((r, i) => (
                                    <tr key={i}>
                                        <td
                                            className="max-w-[18rem] truncate px-3 py-2 font-mono sm:max-w-xl"
                                            title={r.query}
                                        >
                                            {r.query}
                                        </td>
                                        <td className="hud-num px-3 py-2.5 text-right tabular-nums">
                                            {r.calls}
                                        </td>
                                        <td className="hud-num px-3 py-2.5 text-right tabular-nums">
                                            {r.totalMs}
                                        </td>
                                        <td className="hud-num px-3 py-2.5 text-right tabular-nums">
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
                <h3 className="hud-sc text-sm">{t('longTx')}</h3>
                {data.longTx.length === 0 ? (
                    <p className="text-base text-muted-foreground">
                        {t('noLongTx')}
                    </p>
                ) : (
                    <ul className="text-base">
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
