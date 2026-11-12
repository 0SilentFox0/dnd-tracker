'use client';

import type { ComponentProps } from 'react';
import { Joyride } from 'react-joyride';

export type DemoTourRunnerProps = ComponentProps<typeof Joyride>;

export function DemoTourRunner(props: DemoTourRunnerProps) {
    return <Joyride {...props} />;
}
