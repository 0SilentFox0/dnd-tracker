'use client';
import { useState } from 'react';
import Link from 'next/link';

import { HudPill } from '@/components/hud/page';
import { Button } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { useTranslator } from '@/lib/i18n/use-translator';
import { destination } from '@/lib/utils/compendium-import/flow';
import {
    coverageLabel,
    entryParts,
    type IssueGroup,
    readablePath,
    splitInfoIssues,
    statusLabel,
} from '@/lib/utils/compendium-import/labels';
import type { CompendiumReport as Report } from '@/types/compendium-import';

export type Row = Report['rows'][number];

export type BlockerActions = { allowMixedEdition?: () => void; busy?: boolean };

const GROUP_ITEMS_STEP = 20;

const BLOCKER_PREVIEW = 5;

export const DEPENDENCIES_ANCHOR = 'compendium-dependencies';

export function Counts({ counts }: { counts: Report['counts'] }) {
    const t = useTranslator('compendium');

    const tiles = [
        [t('report.tileCreated'), counts.created, false],
        [t('report.tileUpdated'), counts.updated, false],
        [t('report.tileUnchanged'), counts.unchanged, false],
        [t('report.tileErrors'), counts.errors, counts.errors > 0],
    ] as const;

    return (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map(([label, value, bad]) => (
                <li
                    className="rounded-lg border border-hud-line bg-hud-panel px-3 py-2 text-center"
                    key={label}
                >
                    <b
                        className={`block text-lg ${bad ? 'text-hud-bad' : 'text-hud-ink'}`}
                    >
                        {value}
                    </b>
                    <span className="text-xs text-hud-muted">{label}</span>
                </li>
            ))}
        </ul>
    );
}

export function BlockerCard({
    group,
    actions,
}: {
    group: IssueGroup;
    actions?: BlockerActions;
}) {
    const t = useTranslator('compendium');

    const [shown, setShown] = useState(BLOCKER_PREVIEW);

    return (
        <li className="space-y-2 rounded-lg bg-hud-bad/10 p-2">
            <p>
                <strong>{group.title}</strong>{' '}
                <HudPill tone="muted">
                    {t('report.groupRecords', { count: group.items.length })}
                </HudPill>
            </p>
            <p>
                {group.action}
                {group.code === 'NOTES_SIZE' && ` ${t('report.removeChapter')}`}
            </p>
            {group.code === 'MIXED_EDITION_CONFIRMATION_REQUIRED' &&
                actions?.allowMixedEdition && (
                    <Button
                        size="sm"
                        disabled={actions.busy}
                        onClick={actions.allowMixedEdition}
                    >
                        {t('report.allowMixed')}
                    </Button>
                )}
            {group.code === 'UNRESOLVED_REF' && (
                <a
                    className="inline-block text-hud-gold underline"
                    href={`#${DEPENDENCIES_ANCHOR}`}
                >
                    {t('report.goToBinding')}
                </a>
            )}
            <ul className="flex flex-wrap gap-1">
                {group.items.slice(0, shown).map((item, index) => (
                    <li
                        className="max-w-full rounded-full px-2 text-xs break-words text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]"
                        key={index}
                    >
                        {readablePath(t, item.path)}
                    </li>
                ))}
            </ul>
            {group.items.length > shown && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShown(shown + GROUP_ITEMS_STEP)}
                >
                    {t('report.showMore', {
                        count: group.items.length - shown,
                    })}
                </Button>
            )}
        </li>
    );
}

export function IssueGroupCard({
    group,
    link,
}: {
    group: IssueGroup;
    link?: (code: string, path: string) => string;
}) {
    const t = useTranslator('compendium');

    const [shown, setShown] = useState(GROUP_ITEMS_STEP);

    return (
        <li>
            <Disclosure
                className="rounded-lg border border-hud-rule px-3 py-2"
                summary={
                    <span>
                        <strong>{group.title}</strong>{' '}
                        <HudPill tone="muted">{group.items.length}</HudPill>
                    </span>
                }
            >
                <p className="mt-2">{group.action}</p>
                <ul className="mt-2 space-y-1">
                    {group.items.slice(0, shown).map((item, index) => (
                        <li className="break-words" key={index}>
                            <span className="text-xs text-hud-muted">
                                {readablePath(t, item.path)}
                            </span>
                            {item.action && <span> — {item.action}</span>}
                            {link && (
                                <>
                                    {' '}
                                    <Link
                                        className="text-hud-gold underline"
                                        href={link(group.code, item.path)}
                                    >
                                        {t('report.goToAction')}
                                    </Link>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
                {group.items.length > shown && (
                    <Button
                        className="mt-2"
                        variant="outline"
                        size="sm"
                        onClick={() => setShown(shown + GROUP_ITEMS_STEP)}
                    >
                        {t('report.showMore', {
                            count: group.items.length - shown,
                        })}
                    </Button>
                )}
            </Disclosure>
        </li>
    );
}

export function RowCard({
    row,
    committed,
    onNotes,
    campaignId,
}: {
    row: Row;
    committed: boolean;
    onNotes: (row: Row) => void;
    campaignId: string;
}) {
    const t = useTranslator('compendium');

    const actions = splitInfoIssues(row.issues).actions;

    const { kind, name, owner, source } = entryParts(t, row.canonicalKey);

    return (
        <li className="min-w-0">
            <Disclosure
                className="rounded-lg bg-hud-panel p-3 shadow-[inset_0_0_0_1px_var(--color-hud-edge)]"
                summary={
                    <span className="space-y-1">
                        {kind && (
                            <span className="block text-[11px] text-hud-muted uppercase">
                                {kind}
                            </span>
                        )}
                        <span className="hud-sc block text-[15px] break-words text-hud-ink">
                            {kind ? `«${name}»${owner}` : name}
                        </span>
                        {source && (
                            <span className="block text-xs break-words text-hud-muted">
                                {source}
                            </span>
                        )}
                        <span className="flex flex-wrap gap-1 pt-1">
                            <HudPill
                                tone={
                                    row.status === 'unchanged'
                                        ? 'muted'
                                        : 'accent'
                                }
                            >
                                {statusLabel(t, row.status)}
                            </HudPill>
                            <HudPill>{coverageLabel(t, row.coverage)}</HudPill>
                            {actions.length > 0 && (
                                <HudPill tone="bone">
                                    {t('report.manualActionsCount', {
                                        count: actions.length,
                                    })}
                                </HudPill>
                            )}
                        </span>
                    </span>
                }
            >
                <div className="mt-2 space-y-1">
                    {actions.map((issue, i) => (
                        <p key={i} title={issue.code}>
                            {issue.action}{' '}
                            <span className="text-xs break-words text-hud-muted">
                                ({readablePath(t, issue.path)})
                            </span>
                        </p>
                    ))}
                    {committed && (
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" asChild>
                                <Link href={destination(campaignId, row)}>
                                    {t('report.openEditor')}
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onNotes(row)}
                            >
                                {t('report.sourceNotes')}
                            </Button>
                        </div>
                    )}
                </div>
            </Disclosure>
        </li>
    );
}
