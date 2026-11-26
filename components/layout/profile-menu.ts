import {
    CircleHelp,
    Crown,
    Globe,
    KeyRound,
    LogOut,
    type LucideIcon,
    Sparkles,
    UserRoundCog,
    Volume2,
} from 'lucide-react';

type ProfileMenuId =
    | 'help'
    | 'password'
    | 'preferences'
    | 'soundLibrary'
    | 'aiKeys'
    | 'subscription'
    | 'switchAccount'
    | 'signOut';

export type ProfileMenuEntry = {
    id: ProfileMenuId;
    icon: LucideIcon;
    labelKey: ProfileMenuId;
} & ({ href: string } | { action: 'switchAccount' | 'signOut' });

export const PROFILE_MENU: readonly ProfileMenuEntry[] = [
    {
        id: 'preferences',
        icon: Globe,
        labelKey: 'preferences',
        href: '/settings/preferences',
    },
    {
        id: 'password',
        icon: KeyRound,
        labelKey: 'password',
        href: '/settings/password',
    },
    { id: 'aiKeys', icon: Sparkles, labelKey: 'aiKeys', href: '/settings/ai' },
    {
        id: 'subscription',
        icon: Crown,
        labelKey: 'subscription',
        href: '/settings/subscription',
    },
    {
        id: 'soundLibrary',
        icon: Volume2,
        labelKey: 'soundLibrary',
        href: '/library/sounds',
    },
    { id: 'help', icon: CircleHelp, labelKey: 'help', href: '/help' },
    {
        id: 'switchAccount',
        icon: UserRoundCog,
        labelKey: 'switchAccount',
        action: 'switchAccount',
    },
    { id: 'signOut', icon: LogOut, labelKey: 'signOut', action: 'signOut' },
];
