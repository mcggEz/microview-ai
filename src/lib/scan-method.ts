export const SCAN_METHOD_STORAGE_KEY = "MICROVIEW_SCAN_METHOD";
export type ScanMethod = "longitudinal" | "battlement";

export function getScanMethodFromLocalStorage(): ScanMethod {
  if (typeof window === "undefined") return "longitudinal";
  const stored = localStorage.getItem(SCAN_METHOD_STORAGE_KEY);
  if (stored === "battlement") return "battlement";
  return "longitudinal";
}
