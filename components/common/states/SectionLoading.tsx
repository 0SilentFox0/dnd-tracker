import { LoadingState } from '@/components/common/states';

/** Route-level and system-gate skeleton: one look, so the gate hands over to `loading.tsx` without a visible swap */
export function SectionLoading({ label }: { label?: string }) {
    return (
        <div className="container mx-auto p-4 print:hidden">
            <LoadingState rows={6} label={label} />
        </div>
    );
}
