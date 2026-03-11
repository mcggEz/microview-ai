export const GEMINI_KEYS_STORAGE_KEY = "microview_gemini_api_keys";

export function getGeminiKeysFromLocalStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GEMINI_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

