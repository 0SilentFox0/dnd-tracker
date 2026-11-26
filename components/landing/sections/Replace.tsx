import { keysOf } from '@/components/landing/messages';
import { SectionTitle } from '@/components/landing/parts';
import { BRAND } from '@/lib/constants/site';
import type { Translator } from '@/lib/i18n/translator';

export function Replace({ t }: { t: Translator }) {
    const rows = keysOf(t, 'replace.rows');

    const cell = (id: string, key: string) => t(`replace.rows.${id}.${key}`);

    return (
        <section
            id="replace"
            className="ld-lazy ld-panel scroll-mt-20 px-4 py-20"
        >
            <SectionTitle
                eyebrow={t('replace.eyebrow')}
                title={t('replace.title')}
                text={t('replace.text')}
            />
            <div className="ld-container mt-12">
                <table className="landing-reveal hidden w-full border-collapse text-left md:table">
                    <caption className="sr-only">{t('replace.caption')}</caption>
                    <thead>
                        <tr className="hud-sc border-b border-hud-line text-sm text-hud-muted">
                            <th scope="col" className="px-4 py-3 font-normal">
                                {t('replace.headers.category')}
                            </th>
                            <th scope="col" className="px-4 py-3 font-normal">
                                {t('replace.headers.separate')}
                            </th>
                            <th
                                scope="col"
                                className="px-4 py-3 font-normal text-hud-accent-fg"
                            >
                                {BRAND.name}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((id) => (
                            <tr key={id} className="border-b border-hud-rule">
                                <th
                                    scope="row"
                                    className="hud-sc px-4 py-4 text-hud-ink"
                                >
                                    {cell(id, 'category')}
                                </th>
                                <td className="px-4 py-4 text-hud-soft">
                                    {cell(id, 'separate')}
                                </td>
                                <td className="px-4 py-4 text-hud-ink">
                                    {cell(id, 'ours')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <ul className="space-y-4 md:hidden">
                    {rows.map((id) => (
                        <li
                            key={id}
                            className="landing-reveal rounded-xl border border-hud-line bg-hud-surface p-4"
                        >
                            <p className="hud-sc text-lg text-hud-ink">
                                {cell(id, 'category')}
                            </p>
                            <p className="mt-2 text-sm text-hud-soft">
                                {cell(id, 'separate')}
                            </p>
                            <p className="mt-2 text-sm text-hud-accent-fg">
                                {cell(id, 'ours')}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
