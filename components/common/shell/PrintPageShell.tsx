'use client';

import type { ReactNode } from 'react';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function PrintPageShell({
    title,
    hint,
    button,
    empty,
    children,
}: {
    title: string;
    hint: string;
    button: string;
    empty: string | null;
    children: ReactNode;
}) {
    return (
        <div>
            <div className="no-print mb-6 flex items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
                </div>
                <Button
                    onClick={() => window.print()}
                    variant="outline"
                    className="shrink-0"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    {button}
                </Button>
            </div>

            <header className="mb-6 hidden print:block">
                <h1 className="text-2xl font-bold">{title}</h1>
            </header>

            {empty === null ? (
                children
            ) : (
                <p className="text-muted-foreground">{empty}</p>
            )}
        </div>
    );
}
