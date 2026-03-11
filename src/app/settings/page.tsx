"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  GEMINI_KEYS_STORAGE_KEY,
  getGeminiKeysFromLocalStorage,
} from "@/lib/client-gemini-keys";

function maskKey(key: string) {
  const clean = key.trim();
  if (clean.length <= 10) return "•".repeat(Math.max(6, clean.length));
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [visibleKeyIndex, setVisibleKeyIndex] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setKeys(getGeminiKeysFromLocalStorage());
  }, []);

  const cleanedKeys = useMemo(
    () =>
      keys
        .map((k) => k.trim())
        .filter(Boolean)
        .filter((k, i, arr) => arr.indexOf(k) === i),
    [keys]
  );

  function persist(next: string[]) {
    const cleaned = next
      .map((k) => k.trim())
      .filter(Boolean)
      .filter((k, i, arr) => arr.indexOf(k) === i);
    setKeys(cleaned);
    localStorage.setItem(GEMINI_KEYS_STORAGE_KEY, JSON.stringify(cleaned));
    setSavedAt(Date.now());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="outline"
            className="h-9 px-3 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
            onClick={() => router.back()}
            title="Back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="text-xl font-semibold text-gray-900">Settings</div>
            <div className="text-sm text-gray-600">
              Add fallback Gemini API keys for this device.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Gemini API keys (fallback)
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                The app will try the server key first. If it fails (invalid /
                disabled), it will try these keys in order.
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste Gemini API key here…"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
            />
            <Button
              className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => {
                const k = newKey.trim();
                if (!k) return;
                persist([...cleanedKeys, k]);
                setNewKey("");
              }}
              title="Add key"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {cleanedKeys.length === 0 ? (
              <div className="p-4 text-sm text-gray-600 bg-gray-50">
                No fallback keys saved yet.
              </div>
            ) : (
              cleanedKeys.map((k, idx) => {
                const isVisible = visibleKeyIndex === idx;
                return (
                  <div
                    key={`${k}-${idx}`}
                    className="flex items-center justify-between gap-3 p-3 bg-white"
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">
                        Priority #{idx + 1}
                      </div>
                      <div className="text-sm font-mono text-gray-900 truncate">
                        {isVisible ? k : maskKey(k)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="h-9 w-9 p-0 rounded-lg bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                        onClick={() =>
                          setVisibleKeyIndex(isVisible ? null : idx)
                        }
                        title={isVisible ? "Hide key" : "Show key"}
                      >
                        {isVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="h-9 w-9 p-0 rounded-lg bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border border-gray-300"
                        onClick={() => {
                          const next = cleanedKeys.filter((_, i) => i !== idx);
                          persist(next);
                          if (visibleKeyIndex === idx) {
                            setVisibleKeyIndex(null);
                          } else if (
                            visibleKeyIndex !== null &&
                            visibleKeyIndex > idx
                          ) {
                            setVisibleKeyIndex(visibleKeyIndex - 1);
                          }
                        }}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 text-xs text-gray-500">
            {savedAt ? (
              <>Saved.</>
            ) : (
              <>Changes save automatically on this device.</>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-600">
          Note: these keys are stored in your browser storage on this device.
          If you clear browser data, you’ll need to add them again.
        </div>
      </div>
    </div>
  );
}

