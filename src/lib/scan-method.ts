export const SCAN_METHOD_STORAGE_KEY = "MICROVIEW_SCAN_METHOD";
export type ScanMethod = "longitudinal";

export function getScanMethodFromLocalStorage(): ScanMethod {
  return "longitudinal";
}
