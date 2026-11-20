import type { WfrpHitLocationKey } from './keys';
import { Drawn } from './svg';
import type { WfrpIcon } from './types';

type Zone = WfrpHitLocationKey;

const ZONES: Record<Zone, React.ReactNode> = {
    head: <circle cx="12" cy="4.5" r="2.5" />,
    body: <rect x="9" y="8" width="6" height="8.5" rx="1.5" />,
    'left-arm': <rect x="5.2" y="8" width="2.8" height="8.5" rx="1.4" />,
    'right-arm': <rect x="16" y="8" width="2.8" height="8.5" rx="1.4" />,
    'left-leg': <rect x="9" y="17.5" width="2.8" height="5" rx="1.4" />,
    'right-leg': <rect x="12.2" y="17.5" width="2.8" height="5" rx="1.4" />,
};

const hitLocationIcon = (active: Zone): WfrpIcon =>
    function HitLocationIcon(props) {
        return (
            <Drawn {...props}>
                {(Object.keys(ZONES) as Zone[]).map((zone) => (
                    <g
                        key={zone}
                        {...(zone === active
                            ? { fill: 'currentColor' }
                            : { opacity: 0.4 })}
                    >
                        {ZONES[zone]}
                    </g>
                ))}
            </Drawn>
        );
    };

export const HIT_LOCATION_ICONS = Object.fromEntries(
    (Object.keys(ZONES) as Zone[]).map((z) => [z, hitLocationIcon(z)])
) as Record<WfrpHitLocationKey, WfrpIcon>;
