import {
    CircleHelp,
    Globe,
    KeyRound,
    LogOut,
    type LucideIcon,
    Sparkles,
    UserRoundCog,
} from 'lucide-react';

type ProfileMenuId =
    | 'help'
    | 'password'
    | 'preferences'
    | 'aiKeys'
    | 'switchAccount'
    | 'signOut';

export type ProfileMenuEntry = {
    id: ProfileMenuId;
    icon: LucideIcon;
    labelKey: ProfileMenuId;
} & ({ href: string } | { action: 'switchAccount' | 'signOut' });

export const PROFILE_MENU: readonly ProfileMenuEntry[] = [
    { id: 'help', icon: CircleHelp, labelKey: 'help', href: '/help' },
    {
        id: 'password',
        icon: KeyRound,
        labelKey: 'password',
        href: '/settings/password',
    },
    {
        id: 'preferences',
        icon: Globe,
        labelKey: 'preferences',
        href: '/settings/preferences',
    },
    { id: 'aiKeys', icon: Sparkles, labelKey: 'aiKeys', href: '/settings/ai' },
    {
        id: 'switchAccount',
        icon: UserRoundCog,
        labelKey: 'switchAccount',
        action: 'switchAccount',
    },
    { id: 'signOut', icon: LogOut, labelKey: 'signOut', action: 'signOut' },
];
