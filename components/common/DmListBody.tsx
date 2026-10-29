import type { ReactNode } from "react";

import { LoadingState } from "@/components/common/states";

interface DmListBodyProps {
  isLoading: boolean;
  isEmpty: boolean;
  loadingLabel?: string;
  empty: ReactNode;
  children: ReactNode;
}

export function DmListBody({ isLoading, isEmpty, loadingLabel, empty, children }: DmListBodyProps) {
  if (isEmpty) return <>{isLoading ? <LoadingState rows={6} label={loadingLabel} /> : empty}</>;

  return <>{children}</>;
}

export function DmCardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
