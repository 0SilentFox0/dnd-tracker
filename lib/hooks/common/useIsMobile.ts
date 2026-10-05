import { useMediaQuery } from "./useMediaQuery";

export const MOBILE_QUERY = "(max-width: 639px)";

// server and first hydration pass render the desktop variant
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
