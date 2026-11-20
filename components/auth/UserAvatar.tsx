import Image from 'next/image';
import { User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { avatarHue, avatarInitials } from '@/lib/utils/auth/avatar';
import type { SessionUser } from '@/lib/utils/auth/session-user';
import { isHostedOnProjectStorage, toMediaUrl } from '@/lib/utils/common/image-url';

export function UserAvatar({
    user,
    className,
    sizes = '40px',
}: {
    user: SessionUser | null;
    className?: string;
    sizes?: string;
}) {
    const initials = user && !user.avatarUrl;

    return (
        <span
            aria-hidden
            className={cn(
                'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-hud-gold/60 bg-hud-panel text-hud-gold',
                initials && 'text-white',
                className
            )}
            style={
                initials
                    ? { backgroundColor: `hsl(${avatarHue(user.id)}, 45%, 32%)` }
                    : undefined
            }
        >
            {user?.avatarUrl ? (
                <Image
                    src={toMediaUrl(user.avatarUrl)}
                    alt=""
                    fill
                    sizes={sizes}
                    unoptimized={!isHostedOnProjectStorage(user.avatarUrl)}
                    referrerPolicy="no-referrer"
                    className="object-cover"
                />
            ) : user ? (
                <span className="text-[0.75em] font-semibold leading-none">
                    {avatarInitials(user.name, user.email)}
                </span>
            ) : (
                <User className="size-1/2" aria-hidden />
            )}
        </span>
    );
}
