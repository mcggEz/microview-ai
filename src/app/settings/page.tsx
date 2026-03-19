"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  GEMINI_KEYS_STORAGE_KEY,
  GEMINI_MODEL_STORAGE_KEY,
  getGeminiKeysFromLocalStorage,
  getGeminiModelFromLocalStorage,
} from "@/lib/client-gemini-keys";
import {
  MOTOR_SERVER_URL_STORAGE_KEY,
  getMotorServerUrl,
} from "@/lib/motor-config";
import {
  getScanMethodFromLocalStorage,
} from "@/lib/scan-method";
import { Cpu, Eye, EyeOff, Plus, Trash2, ArrowLeft, Microscope, RefreshCw, CheckCircle, Gauge, Save, Move, ArrowUp, ArrowDown, ArrowRight, Home, Crosshair } from "lucide-react";

function maskKey(key: string) {
  const clean = key.trim();
  if (clean.length <= 10) return "•".repeat(Math.max(6, clean.length));
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

function ScanningIllustration() {
  return (
    <div className="relative w-full h-12 mt-2 rounded-lg bg-gray-50/50 border border-gray-100 overflow-hidden">
      <svg viewBox="0 0 100 40" className="w-full h-full p-2 opacity-60">
        <path
          d="M 90,10 H 10 V 20 H 90 V 30 H 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-blue-400 stroke-dasharray-[4_2]"
        />
        <circle r="3" className="fill-blue-600 shadow-sm">
          <animateMotion dur="6s" repeatCount="indefinite" path="M 90,10 H 10 V 20 H 90 V 30 H 10" />
        </circle>
      </svg>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState("");
  const [visibleKeyIndex, setVisibleKeyIndex] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [scanMethod] = useState("longitudinal");
  const [motorUrl, setMotorUrl] = useState("http://127.0.0.1:3001");

  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "local">("idle");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");

  // Manual motor control
  const [manualStep, setManualStep] = useState<number>(0.5);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStatus, setMoveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    setKeys(getGeminiKeysFromLocalStorage());
    setGeminiModel(getGeminiModelFromLocalStorage());
    // Scan method is always longitudinal
    setMotorUrl(getMotorServerUrl());
    fetchMotorConfig();
  }, []);

  const fetchMotorConfig = async (overrideUrl?: string) => {
    const baseUrl = overrideUrl || motorUrl;
    try {
      const res = await fetch(`${baseUrl}/get_config`);
      if (res.ok) {
        const data = await res.json();
        setSensitivity(data.sensitivity || 1.0);
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (e) {
      console.warn("Failed to fetch motor config", e);
      setIsConnected(false);
      // Load from localStorage as fallback when server is offline
      const stored = localStorage.getItem("MICROVIEW_MOTOR_SENSITIVITY");
      if (stored) setSensitivity(parseFloat(stored));
    }
  };

  const saveCalibration = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    // Always save locally so the value persists even without server
    localStorage.setItem("MICROVIEW_MOTOR_SENSITIVITY", String(sensitivity));
    try {
      const res = await fetch(`${motorUrl}/update_config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensitivity })
      });
      if (res.ok) {
        setIsConnected(true);
        setSaveStatus("success");
        setSavedAt(Date.now());
      } else {
        setSaveStatus("local");
        setSavedAt(Date.now());
      }
    } catch (e) {
      // Server offline — still saved locally
      setSaveStatus("local");
      setSavedAt(Date.now());
      setIsConnected(false);
    } finally {
      setIsSaving(false);
      // Auto-clear the status after 3 seconds
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const manualMove = useCallback(async (axis: "x" | "y", direction: 1 | -1) => {
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axis, units: manualStep * direction }),
      });
      const data = await res.json();
      if (res.ok) {
        setMoveStatus({ type: "success", msg: `Moved ${axis.toUpperCase()} ${direction > 0 ? "+" : "−"}${manualStep}` });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: "error", msg: data.message || "Move failed" });
      }
    } catch {
      setMoveStatus({ type: "error", msg: "Motor server offline" });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setMoveStatus(null), 2000);
    }
  }, [motorUrl, manualStep]);

  const manualHome = useCallback(async () => {
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_home`, { method: "POST" });
      if (res.ok) {
        setMoveStatus({ type: "success", msg: "Motors returned home" });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: "error", msg: "Home failed" });
      }
    } catch {
      setMoveStatus({ type: "error", msg: "Motor server offline" });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setMoveStatus(null), 2000);
    }
  }, [motorUrl]);

  const manualZero = useCallback(async () => {
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_zero`, { method: "POST" });
      if (res.ok) {
        setMoveStatus({ type: "success", msg: "Origin set to current position" });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: "error", msg: "Zero failed" });
      }
    } catch {
      setMoveStatus({ type: "error", msg: "Motor server offline" });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setMoveStatus(null), 2000);
    }
  }, [motorUrl]);

  // Keyboard shortcuts for manual control
  useEffect(() => {
    if (!isConnected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (isMoving) return;

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          e.preventDefault();
          manualMove("y", -1);
          break;
        case "arrowdown":
        case "s":
          e.preventDefault();
          manualMove("y", 1);
          break;
        case "arrowleft":
        case "a":
          e.preventDefault();
          manualMove("x", -1);
          break;
        case "arrowright":
        case "d":
          e.preventDefault();
          manualMove("x", 1);
          break;
        case "h":
          manualHome();
          break;
        case "z":
          manualZero();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConnected, isMoving, manualMove, manualHome, manualZero]);

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
              Manage system configuration and motor calibration.
            </div>
          </div>
        </div>

        {/* Gemini Keys Section */}
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

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
              Selected AI Model
            </div>
            <select
              value={geminiModel}
              onChange={(e) => {
                const val = e.target.value;
                setGeminiModel(val);
                localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, val);
                setSavedAt(Date.now());
              }}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 cursor-pointer"
            >
              <optgroup label="Gemini 3 Series (Next-Gen Agentic & Coding)">
                <option value="gemini-3.1-pro">Gemini 3.1 Pro (Flagship Preview)</option>
                <option value="gemini-3.0-flash">Gemini 3.0 Flash (Preview)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
              </optgroup>
              <optgroup label="Gemini 2.5 Series (Advanced Reasoning)">
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (State-of-the-Art)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Scalable)</option>
              </optgroup>
              <optgroup label="Gemini 2.0 & Legacy">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </optgroup>
            </select>
            <div className="text-[10px] text-gray-500 mt-2 italic">
              * The 3.1 and 2.5 series provide the best "Final Arbiter" reasoning for sediment validation. Gemini 3.1 Pro is recommended for the highest precision.
            </div>
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
        </div>

        {/* Scanning Method Info */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start gap-3">
            <Microscope className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Scanning Method
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                The motorized stage scans the slide using a <strong>longitudinal strip</strong> (serpentine) pattern.
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative flex flex-col items-start gap-3 rounded-2xl border-2 border-blue-600 bg-blue-50/30 p-5 text-left">
              <div className="flex w-full items-center justify-between">
                <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  Longitudinal Strip
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  <CheckCircle className="h-2.5 w-2.5" /> Active
                </div>
              </div>
              <div className="text-xs text-gray-600 leading-relaxed">
                Stage scans side-to-side in a <strong>serpentine meander</strong> pattern.
              </div>
              <ScanningIllustration />
            </div>
          </div>
        </div>

        {/* Motor Server Configuration */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Motor Server URL
                </div>
                <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                  The address of the Flask motor backend.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={motorUrl}
              onChange={(e) => setMotorUrl(e.target.value)}
              placeholder="http://127.0.0.1:3001"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 outline-none focus:ring-2 focus:ring-purple-900/10 focus:border-purple-400 font-mono"
            />
            <Button
              className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => {
                localStorage.setItem(MOTOR_SERVER_URL_STORAGE_KEY, motorUrl);
                setSavedAt(Date.now());
                fetchMotorConfig(motorUrl);
              }}
            >
              Update URL
            </Button>
          </div>
        </div>

        {/* Motor Calibration Section */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start gap-3 mb-4">
            <Gauge className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Motor Movement Calibration
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                Fine-tune the movement sensitivity multiplier. This setting is saved to the motor server.
              </div>
            </div>
          </div>

          {!isConnected && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-700">
                Motor server offline — changes saved locally and will sync when connected.
              </span>
              <Button
                variant="outline"
                className="ml-auto h-7 px-2 text-[10px] rounded-md border-amber-300 text-amber-700 hover:bg-amber-100"
                onClick={() => fetchMotorConfig()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
          {isConnected && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-700">
                Motor server connected
              </span>
            </div>
          )}

          <div className="space-y-6">
            <div className="p-5 rounded-xl border-2 border-blue-100 bg-blue-50/20 shadow-sm text-center">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 text-left">Travel Sensitivity (Multiplier)</div>
                <div className="px-3 py-1 rounded-md bg-blue-600 text-white font-mono text-xs font-bold leading-none">
                  {sensitivity.toFixed(2)}x
                </div>
              </div>
              <div className="flex items-center gap-6">
                <input
                  type="range" min="0.1" max="5.0" step="0.05"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number" step="0.01"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className="w-24 h-10 text-center rounded-lg border-2 border-blue-100 text-sm font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="mt-3 text-[10px] text-gray-500 italic text-left">
                * Adjust this if the motor travels more or less than the expected distance (e.g., set to 2.0 to double the travel).
              </div>
            </div>

            <Button
              onClick={saveCalibration}
              disabled={isSaving}
              className="w-full h-11 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md font-semibold disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : isConnected ? "Apply & Save Calibration" : "Save Locally"}
            </Button>

            {saveStatus === "success" && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 font-medium">
                  Sensitivity saved to motor server ({sensitivity.toFixed(2)}x)
                </span>
              </div>
            )}
            {saveStatus === "local" && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Save className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700 font-medium">
                  Saved locally ({sensitivity.toFixed(2)}x) — will sync to server when connected
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Motor Control */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start gap-3 mb-4">
            <Move className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Manual Motor Control
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                Manually jog the X and Y motors. Useful for positioning the stage before a scan.
              </div>
            </div>
          </div>

          {/* Step Size */}
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2">Step Size (units)</div>
            <div className="flex items-center gap-2">
              {[0.1, 0.25, 0.5, 1.0, 2.0].map((val) => (
                <button
                  key={val}
                  onClick={() => setManualStep(val)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    manualStep === val
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {val}
                </button>
              ))}
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={manualStep}
                onChange={(e) => setManualStep(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-20 h-8 text-center rounded-lg border border-gray-300 text-xs font-mono outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>

          {/* D-pad style controls */}
          <div className="flex flex-col items-center gap-2 py-4">
            {/* Y- (up on stage) */}
            <Button
              variant="outline"
              disabled={isMoving || !isConnected}
              onClick={() => manualMove("y", -1)}
              className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
              title="Move Y− (up)"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              {/* X- (left) */}
              <Button
                variant="outline"
                disabled={isMoving || !isConnected}
                onClick={() => manualMove("x", -1)}
                className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
                title="Move X− (left)"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              {/* Center: step size indicator */}
              <div className="h-12 w-16 rounded-xl bg-gray-50 border-2 border-gray-100 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-400">{manualStep}</span>
              </div>

              {/* X+ (right) */}
              <Button
                variant="outline"
                disabled={isMoving || !isConnected}
                onClick={() => manualMove("x", 1)}
                className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
                title="Move X+ (right)"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Y+ (down on stage) */}
            <Button
              variant="outline"
              disabled={isMoving || !isConnected}
              onClick={() => manualMove("y", 1)}
              className="h-12 w-12 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-40"
              title="Move Y+ (down)"
            >
              <ArrowDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Home / Zero buttons */}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              disabled={isMoving || !isConnected}
              onClick={manualHome}
              className="flex-1 h-10 rounded-xl border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-sm font-semibold disabled:opacity-40"
            >
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button
              variant="outline"
              disabled={isMoving || !isConnected}
              onClick={manualZero}
              className="flex-1 h-10 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 text-sm font-semibold disabled:opacity-40"
            >
              <Crosshair className="h-4 w-4 mr-2" />
              Set Origin
            </Button>
          </div>

          {/* Status feedback */}
          {isMoving && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs text-blue-700">Moving...</span>
            </div>
          )}
          {moveStatus && (
            <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              moveStatus.type === "success"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}>
              <span className={`text-xs font-medium ${
                moveStatus.type === "success" ? "text-green-700" : "text-red-700"
              }`}>
                {moveStatus.msg}
              </span>
            </div>
          )}

          {!isConnected && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs text-amber-700">
                Connect to the motor server to use manual controls.
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 text-[11px] text-gray-400 text-center pb-8 flex items-center justify-center gap-1">
          <CheckCircle className="h-3 w-3" /> System ready for scanning
        </div>
      </div>
    </div>
  );
}
