import type { ComponentType, SVGProps } from 'react';

export type WfrpIconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
    size?: number | string;
};

export type WfrpIcon = ComponentType<WfrpIconProps>;
