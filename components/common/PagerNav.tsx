import { Button } from "@/components/ui/button";
import type { PagerControls } from "@/lib/hooks/common";

export function PagerNav({ pager, labels, ariaLabel }: { pager: PagerControls; labels: { prev: string; next: string }; ariaLabel?: string }) {
  return <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" disabled={!pager.canPrev} onClick={pager.prev}>{labels.prev}</Button>
    <Button type="button" variant="outline" disabled={!pager.canNext} onClick={pager.next}>{labels.next}</Button>
  </nav>;
}
