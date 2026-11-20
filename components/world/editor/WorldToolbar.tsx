'use client';

import type { MouseEvent, ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
    CornerLeftUp,
    LogIn,
    type LucideIcon,
    Magnet,
    MapPin,
    MousePointer2,
    Navigation,
    Pentagon,
    Pin,
    Settings2,
    Undo2,
} from 'lucide-react';

import { useWorldEditorContext } from './WorldEditorContext';

import { HudButton } from '@/components/hud';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    MODE_TOOLS,
    type useMapDrawing,
    type WorldMode,
    type WorldTool,
} from '@/lib/hooks/world';
import { cn } from '@/lib/utils';

const TOOLS = [
    { key: 'select', hotkey: 'V', Icon: MousePointer2 },
    { key: 'point', hotkey: 'P', Icon: MapPin },
    { key: 'zone', hotkey: 'Z', Icon: Pentagon },
    { key: 'entry', hotkey: 'E', Icon: LogIn },
    { key: 'move', hotkey: 'M', Icon: Navigation },
] as const satisfies { key: WorldTool; hotkey: string; Icon: LucideIcon }[];

const PINNABLE: readonly WorldTool[] = ['point', 'zone', 'entry'];

const BUTTON =
    'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-hud-rule bg-[rgba(46,36,26,.95)] text-hud-ink transition-colors hover:bg-[rgba(70,54,38,.98)] disabled:opacity-40 disabled:hover:bg-[rgba(46,36,26,.95)] lg:size-10';

const LABELLED = 'xl:w-auto xl:gap-1.5 xl:px-3 xl:text-sm';

function ToolButton({
    label,
    hotkey,
    Icon,
    tip,
    active,
    pinned,
    labelled,
    disabled,
    onClick,
    onDoubleClick,
}: {
    label: string;
    hotkey?: string;
    tip?: string;
    Icon: LucideIcon;
    active?: boolean;
    pinned?: boolean;
    labelled?: boolean;
    disabled?: boolean;
    onClick(e: MouseEvent): void;
    onDoubleClick?(): void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <HudButton
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    disabled={disabled}
                    data-pinned={pinned || undefined}
                    onClick={onClick}
                    onDoubleClick={onDoubleClick}
                    className={cn(
                        BUTTON,
                        labelled && LABELLED,
                        active &&
                            'metal-gold metal-fill border-[var(--gold)] hover:bg-transparent'
                    )}
                >
                    <Icon className="size-5" aria-hidden />
                    {labelled ? (
                        <span className="hidden xl:inline">{label}</span>
                    ) : null}
                    {pinned ? (
                        <Pin className="size-3 shrink-0" aria-hidden />
                    ) : null}
                </HudButton>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                {label}
                {hotkey ? (
                    <kbd className="ml-2 rounded border border-white/30 px-1 font-mono">
                        {hotkey}
                    </kbd>
                ) : null}
                {tip ? <span className="block text-xs">{tip}</span> : null}
            </TooltipContent>
        </Tooltip>
    );
}

export function WorldToolbar({
    drawing,
    mode = 'build',
    snap,
    readOnly = false,
    onSettings,
    children,
}: {
    drawing: ReturnType<typeof useMapDrawing>;
    mode?: WorldMode;
    snap?: { enabled: boolean; setEnabled(v: boolean): void };
    readOnly?: boolean;
    onSettings?(): void;
    children?: ReactNode;
}) {
    const { detail, maps, openMap } = useWorldEditorContext();

    const t = useTranslations('world.toolbar');

    const { tool, setTool, pinned, draft, undoVertex } = drawing;

    const parent = detail?.map.parentMapId
        ? maps.find((m) => m.id === detail.map.parentMapId)
        : undefined;

    return (
        <TooltipProvider delayDuration={300}>
            <div className="rounded-md border border-hud-rule bg-hud-page/97">
                <div className="flex flex-col lg:flex-row lg:items-center">
                    <div
                        role="group"
                        aria-label={t('group')}
                        className="hud-scroll-x flex w-full items-center gap-1 overflow-x-auto p-1 lg:min-w-0 lg:flex-1"
                    >
                        {TOOLS.filter(({ key }) =>
                            MODE_TOOLS[mode].includes(key)
                        ).map(({ key, hotkey, Icon }) => {
                            const pinnable = PINNABLE.includes(key);

                            return (
                                <ToolButton
                                    key={key}
                                    label={t(key)}
                                    hotkey={hotkey}
                                    tip={pinnable ? t('pinHint') : undefined}
                                    Icon={Icon}
                                    labelled
                                    active={tool === key}
                                    pinned={tool === key && pinned.value}
                                    disabled={readOnly}
                                    onClick={(e) =>
                                        setTool(key, pinnable && e.shiftKey)
                                    }
                                    onDoubleClick={
                                        pinnable
                                            ? () => setTool(key, true)
                                            : undefined
                                    }
                                />
                            );
                        })}
                        {tool === 'zone' ? (
                            <>
                                <span
                                    aria-hidden
                                    className="mx-0.5 h-6 w-px shrink-0 bg-hud-rule"
                                />
                                <ToolButton
                                    label={t('undoVertex')}
                                    hotkey="⌫"
                                    Icon={Undo2}
                                    disabled={draft.length === 0}
                                    onClick={undoVertex}
                                />
                            </>
                        ) : null}
                        {parent ? (
                            <>
                                <span
                                    aria-hidden
                                    className="mx-0.5 h-6 w-px shrink-0 bg-hud-rule"
                                />
                                <HudButton
                                    type="button"
                                    aria-label={t('toParent', {
                                        name: parent.name,
                                    })}
                                    onClick={() => openMap(parent.id)}
                                    className={cn(
                                        BUTTON,
                                        'w-auto max-w-40 gap-1 px-2 text-xs lg:w-auto'
                                    )}
                                >
                                    <CornerLeftUp
                                        className="size-4 shrink-0"
                                        aria-hidden
                                    />
                                    <span className="truncate">
                                        {parent.name}
                                    </span>
                                </HudButton>
                            </>
                        ) : null}
                        {snap && mode === 'build' ? (
                            <ToolButton
                                label={t('snap')}
                                tip={t('snapHint')}
                                Icon={Magnet}
                                active={snap.enabled}
                                disabled={readOnly}
                                onClick={() => snap.setEnabled(!snap.enabled)}
                            />
                        ) : null}
                        {onSettings && mode === 'build' ? (
                            <ToolButton
                                label={t('settings')}
                                Icon={Settings2}
                                disabled={readOnly}
                                onClick={onSettings}
                            />
                        ) : null}
                    </div>
                    {children ? (
                        <div
                            data-slot="toolbar-extras"
                            className="flex shrink-0 items-center gap-1 border-t border-hud-rule p-1 lg:border-t-0 lg:pl-2"
                        >
                            {children}
                        </div>
                    ) : null}
                </div>
            </div>
        </TooltipProvider>
    );
}

const KEY = 'font-normal text-hud-gold-bright';

export function WorldToolHint({
    tool,
    vertices,
}: {
    tool: WorldTool;
    vertices: number;
}) {
    const t = useTranslations('world.hint');

    if (tool === 'select') return null;

    const key = (chunks: ReactNode) => <b className={KEY}>{chunks}</b>;

    return (
        <p
            role="status"
            className="pointer-events-none w-max max-w-[min(22rem,calc(100vw-2rem))] rounded-md border border-[var(--gold)]/60 bg-black/80 px-3 py-1.5 text-center text-xs text-hud-ink"
        >
            {t.rich(tool, { key, vertices })}
        </p>
    );
}
