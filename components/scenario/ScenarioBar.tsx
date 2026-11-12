'use client';

import { type ReactNode, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, List } from 'lucide-react';

import {
    ActionsMenu,
    type ActionsMenuItem,
} from '@/components/common/ActionsMenu';
import { useCssVarHeight } from '@/lib/hooks/common';

type NavTarget = { href: string; title: string };

type Props = {
    title: string;
    notes: { hidden: boolean; toggle: () => void };
    toc?: { onOpen: () => void };
    nav?: { prev?: NavTarget; next?: NavTarget };
    actions?: ReactNode;
    menu: ActionsMenuItem[];
};

export function ScenarioBar({ title, notes, toc, nav, actions, menu }: Props) {
    const t = useTranslations('scenario.bar');

    const ref = useRef<HTMLDivElement>(null);

    useCssVarHeight(ref, '--sb-bar-h');

    useCssVarHeight(ref, '--app-header-h', 'header');

    return (
        <div ref={ref} className="sb-bar">
            <div className="sb-bar-in" data-tour="scenario.bar">
                {nav?.prev && (
                    <Link
                        className="toggle sb-bar-nav"
                        href={nav.prev.href}
                        aria-label={`${t('prevScene')}: ${nav.prev.title}`}
                    >
                        <ArrowLeft className="size-4" aria-hidden />
                        <span className="sb-bar-nav-label">
                            {nav.prev.title}
                        </span>
                    </Link>
                )}
                {toc && (
                    <button
                        type="button"
                        className="toggle sb-bar-toc"
                        aria-label={t('sections')}
                        onClick={toc.onOpen}
                    >
                        <List className="size-4" />{' '}
                        <span className="sb-bar-toc-label">
                            {t('sections')}
                        </span>
                    </button>
                )}
                <strong>{title}</strong>
                <div className="sb-bar-btns">
                    <button
                        type="button"
                        className="toggle"
                        aria-pressed={notes.hidden}
                        onClick={notes.toggle}
                    >
                        {notes.hidden ? t('showNotes') : t('hideNotes')}
                    </button>
                    {actions}
                    {menu.length > 0 && (
                        <ActionsMenu
                            actions={menu}
                            label={t('more')}
                            triggerClassName="toggle sb-bar-more"
                        />
                    )}
                </div>
                {nav?.next && (
                    <Link
                        className="toggle sb-bar-nav"
                        href={nav.next.href}
                        aria-label={`${t('nextScene')}: ${nav.next.title}`}
                    >
                        <span className="sb-bar-nav-label">
                            {nav.next.title}
                        </span>
                        <ArrowRight className="size-4" aria-hidden />
                    </Link>
                )}
            </div>
        </div>
    );
}
