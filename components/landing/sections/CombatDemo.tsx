import type { CSSProperties, ReactNode } from 'react';

import { D20 } from '@/components/landing/Dice';
import { MediaFrame, Screen } from '@/components/landing/MediaFrame';
import { PlayInView } from '@/components/landing/PlayInView';
import type { Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translator';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

// seconds into the 12 s loop
export const T = {
    turnA: 0.3,
    die: 1,
    roll: 2.3,
    slash: 2.95,
    hit1: 3.05,
    logHit: 3.5,
    advance: 5.2,
    turnB: 5.7,
    spell: 6,
    bolt: 6.4,
    burst: 7.2,
    save1: 7.6,
    save2: 7.85,
    hitA: 7.9,
    hitB: 8.1,
    logSpell: 8.4,
};

type FoeSpec = {
    key: 'target' | 'foeA' | 'foeB';
    p: Point;
    hp: number[];
    hits: number[];
    max: number;
    bare?: boolean;
    size?: number;
};

type Scene = {
    round: number;
    sprite: string;
    initiative: { from: number; to: number; y: number };
    attacker: Point;
    caster: Point;
    ring: number;
    target: Point;
    blast: Point;
    blastSize: number;
    foes: FoeSpec[];
    die: Point;
    turnChip: Point;
    rollChip: { p: Point; end?: boolean };
    spellChip: Point;
    save1: Point;
    save2: Point;
    log: { x: number; y: number; w: number; h: number };
};

// % of each locale's battle frame (showcaseMedia(locale).combat); retune whenever those screenshots change.
// Foes flagged bare sit on real tokens (plate and damage only); the others are overlay tokens on empty floor.
export const SCENES: Record<Locale, Scene> = {
    en: {
        round: 3,
        sprite: '/landing/en/demo-tokens.webp',
        initiative: { from: 54.4, to: 56.6, y: 3.9 },
        attacker: { x: 16.7, y: 23.6 },
        caster: { x: 38.9, y: 58.8 },
        ring: 7.4,
        target: { x: 72, y: 40 },
        blast: { x: 66.3, y: 73 },
        blastSize: 17,
        foes: [
            {
                key: 'target',
                p: { x: 72.2, y: 57.5 },
                hp: [59, 47],
                hits: [T.hit1],
                max: 59,
                bare: true,
            },
            {
                key: 'foeA',
                p: { x: 61.1, y: 82.6 },
                hp: [26, 2],
                hits: [T.hitA],
                max: 26,
                bare: true,
            },
            {
                key: 'foeB',
                p: { x: 71.5, y: 69 },
                hp: [26, 14],
                hits: [T.hitB],
                max: 26,
                size: 6.6,
            },
        ],
        die: { x: 24.5, y: 19.5 },
        turnChip: { x: 40.5, y: 9 },
        rollChip: { p: { x: 21, y: 28.5 } },
        spellChip: { x: 42.8, y: 52 },
        save1: { x: 60.8, y: 66 },
        save2: { x: 60.8, y: 60 },
        log: { x: 40.5, y: 73, w: 15.5, h: 24 },
    },
    uk: {
        round: 9,
        sprite: '/landing/uk/demo-tokens.webp',
        initiative: { from: 51.8, to: 54.2, y: 3.75 },
        attacker: { x: 34.8, y: 62 },
        caster: { x: 34.8, y: 28.7 },
        ring: 5.3,
        target: { x: 62, y: 47 },
        blast: { x: 60.25, y: 56.5 },
        blastSize: 16,
        foes: [
            {
                key: 'foeA',
                p: { x: 63.5, y: 54.3 },
                hp: [60, 48, 24],
                hits: [T.hit1, T.hitA],
                max: 60,
                bare: true,
            },
            {
                key: 'foeB',
                p: { x: 57, y: 64 },
                hp: [60, 48],
                hits: [T.hitB],
                max: 60,
                size: 6.4,
            },
        ],
        die: { x: 26.5, y: 50.5 },
        turnChip: { x: 44.5, y: 10.8 },
        rollChip: { p: { x: 32.5, y: 55.5 }, end: true },
        spellChip: { x: 39, y: 21 },
        save1: { x: 70, y: 38 },
        save2: { x: 51.5, y: 68 },
        log: { x: 72, y: 9, w: 18, h: 36 },
    },
};

// frame is 16:10, so one % of height is 0.625 cqw
const ASPECT = 10 / 16;

// sprite index in the locale's demo-tokens.webp
const PORTRAIT = { attacker: 0, caster: 1, overlay: 2 };

const SPRITE_COLS = 3;

type Vars = Record<`--${string}`, string | number>;

const at = (p: Point, extra?: Vars) =>
    ({ '--x': p.x, '--y': p.y, ...extra }) as CSSProperties;

const vars = (v: Vars) => v as CSSProperties;

function Foe({
    name,
    p,
    hp,
    max,
    hits,
    bare,
    size = 3.9,
}: {
    name: string;
    p: Point;
    hp: number[];
    max: number;
    hits: number[];
    bare?: boolean;
    size?: number;
}) {
    const [h0, h1, h2 = h1] = hp;

    const [t1, t2 = 99] = hits;

    return (
        <div
            className={cn('ld-demo-foe', bare && 'ld-demo-foe-bare')}
            style={at(p, {
                '--t': t1,
                '--t2h': t2,
                '--hp0': h0 / max,
                '--hp1': h1 / max,
                '--hp2': h2 / max,
                '--ps': `${size}cqw`,
            })}
        >
            {!bare && (
                <span
                    className="ld-demo-portrait"
                    style={vars({ '--i': PORTRAIT.overlay })}
                />
            )}
            <span className="ld-demo-plate">
                <b>{name}</b>
                <span className="ld-demo-hp">
                    <i />
                    <span className="ld-demo-hp-a">
                        {h0}/{max}
                    </span>
                    <span className="ld-demo-hp-b">
                        {h1}/{max}
                    </span>
                    {hp.length > 2 && (
                        <span className="ld-demo-hp-c">
                            {h2}/{max}
                        </span>
                    )}
                </span>
            </span>
            <span className="ld-demo-dmg">−{h0 - h1}</span>
            {hp.length > 2 && (
                <span
                    className="ld-demo-dmg"
                    style={vars({ '--t': t2, '--t2h': 99 })}
                >
                    −{h1 - h2}
                </span>
            )}
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
    const scene = SCENES[locale];

    const name = (k: 'attacker' | 'caster' | 'target' | 'foeA' | 'foeB') =>
        t(`combat.demo.names.${k}`);

    const { caster, blast, initiative, attacker, foes, log } = scene;

    const foe = (key: FoeSpec['key']) => foes.find((f) => f.key === key);

    const hit = foe('target') ?? foe('foeA');

    const hitLoss = hit ? hit.hp[0] - hit.hp[1] : 0;

    const spellLoss = (key: 'foeA' | 'foeB') => {
        const f = foe(key);

        return f ? f.hp[f.hp.length - 2] - f.hp[f.hp.length - 1] : 0;
    };

    const angle = Math.atan2((blast.y - caster.y) * ASPECT, blast.x - caster.x);

    return (
        <PlayInView className="ld-demo" label={t('combat.demo.label')}>
            <MediaFrame title={t('combat.demo.windowTitle')}>
                <div
                    className="ld-demo-screen"
                    style={vars({
                        '--sprite': `url(${scene.sprite})`,
                        '--cols': SPRITE_COLS,
                        '--ring': `${scene.ring}cqw`,
                        '--blast': `${scene.blastSize}cqw`,
                    })}
                >
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
                                    '--x0': initiative.from,
                                    '--x1': initiative.to,
                                    '--y': initiative.y,
                                    '--t': T.advance,
                                })}
                            />
                            <span
                                className="ld-demo-active ld-demo-active-a"
                                style={at(attacker, {
                                    '--t': T.turnA,
                                    '--t2': T.advance,
                                })}
                            />
                            <span
                                className="ld-demo-active"
                                style={at(caster, { '--t': T.turnB })}
                            />

                            {foes.map(({ key, ...f }) => (
                                <Foe key={key} name={name(key)} {...f} />
                            ))}

                            <span
                                className="ld-demo-die"
                                style={at(scene.die, {
                                    '--t': T.die,
                                    '--t2': T.roll,
                                })}
                            >
                                <D20 value="17" className="size-full" />
                            </span>
                            <svg
                                viewBox="0 0 100 100"
                                className="ld-demo-slash"
                                style={at(scene.target, { '--t': T.slash })}
                            >
                                <path d="M14 22 Q52 46 86 80" />
                                <path d="M26 12 Q60 38 92 64" />
                            </svg>
                            <span
                                className="ld-demo-sprite ld-demo-spark"
                                style={at(scene.target, { '--t': T.slash })}
                            />

                            <span
                                className="ld-demo-area"
                                style={at(blast, { '--t': T.burst })}
                            />
                            <span
                                className="ld-demo-bolt"
                                style={vars({
                                    '--x0': caster.x,
                                    '--y0': caster.y,
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
                                p={scene.turnChip}
                                t={T.turnA}
                                until={T.advance}
                                className="ld-demo-turn ld-demo-turn-a"
                            >
                                {t('combat.demo.turn.attacker')}
                            </Chip>
                            <Chip
                                p={scene.turnChip}
                                t={T.turnB}
                                className="ld-demo-turn"
                            >
                                {t('combat.demo.turn.caster')}
                            </Chip>
                            <Chip
                                p={scene.rollChip.p}
                                t={T.roll}
                                className={
                                    scene.rollChip.end
                                        ? 'ld-demo-end'
                                        : undefined
                                }
                            >
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
                            <Chip p={scene.spellChip} t={T.spell}>
                                <span className="ld-demo-spell">
                                    {t('combat.demo.spell.name')}
                                </span>
                                <span>{t('combat.demo.spell.dc')}</span>
                            </Chip>
                            <Chip
                                p={scene.save1}
                                t={T.save1}
                                className="ld-demo-end"
                            >
                                <span className="ld-demo-label">
                                    {name('foeA')}
                                </span>
                                <span>{t('combat.demo.save.label')}</span>
                                <span className="ld-demo-math">9</span>
                                <span className="ld-demo-bad">
                                    {t('combat.demo.save.fail')}
                                </span>
                            </Chip>
                            <Chip
                                p={scene.save2}
                                t={T.save2}
                                className="ld-demo-end"
                            >
                                <span className="ld-demo-label">
                                    {name('foeB')}
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
                                '--x': log.x,
                                '--y': log.y,
                                '--w': log.w,
                                '--h': log.h,
                            })}
                        >
                            <p className="ld-demo-round">
                                {t('combat.demo.log.round', { n: scene.round })}
                            </p>
                            <ol aria-label={t('combat.demo.log.title')}>
                                <Entry
                                    t={T.logSpell}
                                    portrait={PORTRAIT.caster}
                                    who={name('caster')}
                                    kind={t('combat.demo.log.spell')}
                                    text={t('combat.demo.log.fireball')}
                                    tags={[
                                        `${name('foeA')} −${spellLoss('foeA')}`,
                                        `${name('foeB')} −${spellLoss('foeB')}`,
                                    ]}
                                />
                                <Entry
                                    t={T.logHit}
                                    portrait={PORTRAIT.attacker}
                                    who={name('attacker')}
                                    kind={t('combat.demo.log.attack')}
                                    text={t('combat.demo.log.hit')}
                                    tags={[`${name('target')} −${hitLoss}`]}
                                />
                                <li className="ld-demo-round">
                                    {t('combat.demo.log.round', {
                                        n: scene.round - 1,
                                    })}
                                </li>
                                <Entry
                                    portrait={PORTRAIT.attacker}
                                    who={name('attacker')}
                                    kind={t('combat.demo.log.attack')}
                                    text={t('combat.demo.log.older')}
                                    tags={[`${name('target')} −2`]}
                                />
                            </ol>
                        </div>
                    </div>
                </div>
            </MediaFrame>
        </PlayInView>
    );
}
