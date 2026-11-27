'use client';

import dynamic from 'next/dynamic';

import type { BarBreakdownProps } from './types';

const View = dynamic(() => import('./BarBreakdownView'), {
    ssr: false,
    loading: () => <div className="h-24" aria-hidden />,
});

export function BarBreakdown(props: BarBreakdownProps) {
    return <View {...props} />;
}
