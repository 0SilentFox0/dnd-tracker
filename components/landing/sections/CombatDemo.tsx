import type { CSSProperties, ReactNode } from 'react';

import { D20 } from '@/components/landing/Dice';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { PlayInView } from '@/components/landing/PlayInView';
import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

// % of the battle frame (showcaseMedia(locale).combat); retune all of these whenever that screenshot changes
const ANCHORS = {
    initiative: {
        captain: { x: 9.54, y: 19.04 },
        priest: { x: 25.7, y: 19.04 },
    },
    captain: { x: 32.2, y: 36.7 },
    priest: { x: 57.9, y: 36.7 },
    treant: { x: 37.5, y: 53 },
    spider1: { x: 63, y: 63 },
    spider2: { x: 70.5, y: 75 },
    die: { x: 44.6, y: 49.5 },
    blast: { x: 66.7, y: 69 },
    turnChip: { x: 57.4, y: 26.4 },
    rollChip: { x: 42, y: 53.6 },
    spellChip: { x: 60.8, y: 43.6 },
    save1: { x: 59.6, y: 61.4 },
    save2: { x: 67.2, y: 72.4 },
    log: { x: 82, y: 31.6, w: 16.8, h: 53 },
} as const;

// frame is 16:10, so one % of height is 0.625 cqw
const ASPECT = 10 / 16;

// seconds into the 12 s loop
const T = {
    turnA: 0.3,
    die: 1,
    roll: 2.3,
    slash: 2.95,
    treantHit: 3.05,
    logHit: 3.5,
    advance: 5.2,
    turnB: 5.7,
    spell: 6,
    bolt: 6.4,
    burst: 7.2,
    save1: 7.6,
    save2: 7.85,
    spider1Hit: 7.9,
    spider2Hit: 8.1,
    logSpell: 8.4,
};

// sprite index in /landing/demo-portraits.webp
const PORTRAIT = { treant: 0, spider: 1, captain: 2, priest: 3 };

type Vars = Record<`--${string}`, string | number>;

const at = (p: Point, extra?: Vars) =>
    ({ '--x': p.x, '--y': p.y, ...extra }) as CSSProperties;

const vars = (v: Vars) => v as CSSProperties;

function Foe({
    name,
    p,
    portrait,
    hp: [from, to, max],
    hitAt,
}: {
    name: string;
    p: Point;
    portrait: number;
    hp: [number, number, number];
    hitAt: number;
}) {
    return (
        <div
            className="ld-demo-foe"
            style={at(p, {
                '--t': hitAt,
                '--hp0': from / max,
                '--hp1': to / max,
            })}
        >
            <span
                className="ld-demo-portrait"
                style={vars({ '--i': portrait })}
            />
            <span className="ld-demo-plate">
                <b>{name}</b>
                <span className="ld-demo-hp">
                    <i />
                    <span className="ld-demo-hp-a">
                        {from}/{max}
                    </span>
                    <span className="ld-demo-hp-b">
                        {to}/{max}
                    </span>
                </span>
            </span>
            <span className="ld-demo-dmg">−{from - to}</span>
        </div>
    );
}

function Chip({
    p,
    t,
    until = 99,
    className,
    children,
}: {
    p: Point;
    t: number;
    until?: number;
    className?: string;
    children: ReactNode;
}) {
    return (
        <p
            className={cn('ld-demo-chip', className)}
            style={at(p, { '--t': t, '--t2': until })}
        >
            {children}
        </p>
    );
}

function Entry({
    t,
    portrait,
    who,
    kind,
    text,
    tags,
}: {
    t?: number;
    portrait: number;
    who: string;
    kind: string;
    text: string;
    tags: string[];
}) {
    return (
        <li
            className={t === undefined ? 'ld-demo-entry-old' : 'ld-demo-entry'}
            style={t === undefined ? undefined : vars({ '--t': t })}
        >
            <div className="ld-demo-card">
                <span
                    aria-hidden
                    className="ld-demo-portrait"
                    style={vars({ '--i': portrait })}
                />
                <div>
                    <p className="ld-demo-who">
                        <b>{who}</b> · {kind}
                    </p>
                    <p>{text}</p>
                    <p className="ld-demo-tags">
                        {tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                        ))}
                    </p>
                </div>
            </div>
        </li>
    );
}

export function CombatDemo({ t, locale }: { t: Translator; locale: Locale }) {
    const name = (k: 'captain' | 'priest' | 'treant' | 'spider1' | 'spider2') =>
        t(`combat.demo.names.${k}`);

    const { priest, blast, initiative } = ANCHORS;

    const angle = Math.atan2((blast.y - priest.y) * ASPECT, blast.x - priest.x);

    return (
        <PlayInView className="ld-demo" label={t('combat.demo.label')}>
            <MediaFrame title={t('combat.demo.windowTitle')}>
                <div className="ld-demo-screen">
                    <div className="relative">
                        <Screen
                            locale={locale}
                            id="combat"
                            alt={t('combat.demo.alt')}
                        />
                        <div aria-hidden className="ld-demo-map ld-demo-layer">
                            <span
                                className="ld-demo-init"
                                style={vars({
                                    '--x0': initiative.captain.x,
                                    '--x1': initiative.priest.x,
                                    '--y': initiative.captain.y,
                                    '--t': T.advance,
                                })}
                            />
                            <span
                                className="ld-demo-active ld-demo-active-a"
                                style={at(ANCHORS.captain, {
                                    '--t': T.turnA,
                                    '--t2': T.advance,
                                })}
                            />
                            <span
                                className="ld-demo-active"
                                style={at(priest, { '--t': T.turnB })}
                            />

                            <Foe
                                name={name('treant')}
                                p={ANCHORS.treant}
                                portrait={PORTRAIT.treant}
                                hp={[30, 18, 34]}
                                hitAt={T.treantHit}
                            />
                            <Foe
                                name={name('spider1')}
                                p={ANCHORS.spider1}
                                portrait={PORTRAIT.spider}
                                hp={[26, 2, 26]}
                                hitAt={T.spider1Hit}
                            />
                            <Foe
                                name={name('spider2')}
                                p={ANCHORS.spider2}
                                portrait={PORTRAIT.spider}
                                hp={[26, 14, 26]}
                                hitAt={T.spider2Hit}
                            />

                            <span
                                className="ld-demo-die"
                                style={at(ANCHORS.die, {
                                    '--t': T.die,
                                    '--t2': T.roll,
                                })}
                            >
                                <D20 value="17" className="size-full" />
                            </span>
                            <svg
                                viewBox="0 0 100 100"
                                className="ld-demo-slash"
                                style={at(ANCHORS.treant, { '--t': T.slash })}
                            >
                                <path d="M14 22 Q52 46 86 80" />
                                <path d="M26 12 Q60 38 92 64" />
                            </svg>
                            <span
                                className="ld-demo-sprite ld-demo-spark"
                                style={at(ANCHORS.treant, { '--t': T.slash })}
                            />

                            <span
                                className="ld-demo-area"
                                style={at(blast, { '--t': T.burst })}
                            />
                            <span
                                className="ld-demo-bolt"
                                style={vars({
                                    '--x0': priest.x,
                                    '--y0': priest.y,
                                    '--x1': blast.x,
                                    '--y1': blast.y,
                                    '--ang': `${angle}rad`,
                                    '--t': T.bolt,
                                    '--t2': T.burst,
                                })}
                            />
                            <span
                                className="ld-demo-sprite ld-demo-burst"
                                style={at(blast, { '--t': T.burst })}
                            />
                        </div>
                    </div>

                    <div className="ld-demo-hud">
                        <div
                            aria-hidden
                            className="ld-demo-chips ld-demo-layer"
                        >
                            <Chip
                                p={ANCHORS.turnChip}
                                t={T.turnA}
                                until={T.advance}
                                className="ld-demo-turn ld-demo-turn-a"
                            >
                                {t('combat.demo.turn.captain')}
                            </Chip>
                            <Chip
                                p={ANCHORS.turnChip}
                                t={T.turnB}
                                className="ld-demo-turn"
                            >
                                {t('combat.demo.turn.priest')}
                            </Chip>
                            <Chip p={ANCHORS.rollChip} t={T.roll}>
                                <span className="ld-demo-label">
                                    {t('combat.demo.roll.label')}
                                </span>
                                <span className="ld-demo-math">
                                    17 + 5 = 22
                                </span>
                                <span>{t('combat.demo.roll.target')}</span>
                                <span className="ld-demo-ok">
                                    {t('combat.demo.roll.hit')}
                                </span>
                            </Chip>
                            <Chip p={ANCHORS.spellChip} t={T.spell}>
                                <span className="ld-demo-spell">
                                    {t('combat.demo.spell.name')}
                                </span>
                                <span>{t('combat.demo.spell.dc')}</span>
                            </Chip>
                            <Chip
                                p={ANCHORS.save1}
                                t={T.save1}
                                className="ld-demo-end"
                            >
                                <span className="ld-demo-label">
                                    {name('spider1')}
                                </span>
                                <span>{t('combat.demo.save.label')}</span>
                                <span className="ld-demo-math">9</span>
                                <span className="ld-demo-bad">
                                    {t('combat.demo.save.fail')}
                                </span>
                            </Chip>
                            <Chip
                                p={ANCHORS.save2}
                                t={T.save2}
                                className="ld-demo-end"
                            >
                                <span className="ld-demo-label">
                                    {name('spider2')}
                                </span>
                                <span>{t('combat.demo.save.label')}</span>
                                <span className="ld-demo-math">16</span>
                                <span className="ld-demo-ok">
                                    {t('combat.demo.save.success')}
                                </span>
                            </Chip>
                        </div>

                        <div
                            className="ld-demo-log"
                            style={vars({
                                '--x': ANCHORS.log.x,
                                '--y': ANCHORS.log.y,
                                '--w': ANCHORS.log.w,
                                '--h': ANCHORS.log.h,
                            })}
                        >
                            <p className="ld-demo-round">
                                {t('combat.demo.log.round3')}
                            </p>
                            <ol aria-label={t('combat.demo.log.title')}>
                                <Entry
                                    t={T.logSpell}
                                    portrait={PORTRAIT.priest}
                                    who={name('priest')}
                                    kind={t('combat.demo.log.spell')}
                                    text={t('combat.demo.log.fireball')}
                                    tags={[
                                        `${name('spider1')} −24`,
                                        `${name('spider2')} −12`,
                                    ]}
                                />
                                <Entry
                                    t={T.logHit}
                                    portrait={PORTRAIT.captain}
                                    who={name('captain')}
                                    kind={t('combat.demo.log.attack')}
                                    text={t('combat.demo.log.hit')}
                                    tags={[`${name('treant')} −12`]}
                                />
                                <li className="ld-demo-round">
                                    {t('combat.demo.log.round2')}
                                </li>
                                <Entry
                                    portrait={PORTRAIT.captain}
                                    who={name('captain')}
                                    kind={t('combat.demo.log.attack')}
                                    text={t('combat.demo.log.older')}
                                    tags={[`${name('treant')} −2`]}
                                />
                            </ol>
                        </div>
                    </div>
                </div>
            </MediaFrame>
        </PlayInView>
    );
}
