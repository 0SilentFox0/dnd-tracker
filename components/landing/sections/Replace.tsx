import { keysOf } from '@/components/landing/messages';
import { BrandMark, SectionTitle } from '@/components/landing/parts';
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
            <div className="ld-container ld-merge relative mt-12">
                <div aria-hidden className="ld-merge-col hidden md:block" />
                <table className="relative hidden w-full table-fixed border-collapse text-left md:table">
                    <caption className="sr-only">
                        {t('replace.caption')}
                    </caption>
                    <colgroup>
                        <col className="w-[26%]" />
                        <col className="w-[37%]" />
                        <col className="w-[37%]" />
                    </colgroup>
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
                                className="px-5 py-3 font-normal text-hud-accent-fg"
                            >
                                <span className="flex items-center gap-2">
                                    <BrandMark className="size-6" />
                                    {BRAND.name}
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((id) => (
                            <tr
                                key={id}
                                className="ld-merge-row border-b border-hud-rule"
                            >
                                <th
                                    scope="row"
                                    className="hud-sc px-4 py-4 text-hud-ink"
                                >
                                    {cell(id, 'category')}
                                </th>
                                <td className="px-4 py-4 text-hud-soft">
                                    <span className="ld-sep block">
                                        {cell(id, 'separate')}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-hud-ink">
                                    <span className="ld-ours block">
                                        {cell(id, 'ours')}
                                    </span>
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
                            <p className="mt-2 border-l-2 border-[var(--ld-gold)] pl-3 text-sm text-hud-accent-fg">
                                {cell(id, 'ours')}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
