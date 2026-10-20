import { useMediaQuery } from "./useMediaQuery";

const MOBILE_QUERY = "(max-width: 639px)";

/** Десктопна розкладка бою (три колонки) */
export const DESKTOP_QUERY = "(min-width: 1024px)";

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
