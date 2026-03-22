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
  getMotorSensitivity,
  setMotorSensitivity,
} from "@/lib/motor-config";
import { Cpu, Eye, EyeOff, Plus, Trash2, ArrowLeft, Microscope, RefreshCw, CheckCircle, Gauge, Save, Move, ArrowUp, ArrowDown, ArrowRight, Home, Crosshair } from "lucide-react";

function maskKey(key: string) {
  const clean = key.trim();
  if (clean.length <= 10) return "•".repeat(Math.max(6, clean.length));
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

function ScanningIllustration() {
  return (
    <div className="relative w-full h-10 mt-1 rounded-lg bg-gray-50/50 border border-gray-100 overflow-hidden shrink-0">
      <svg viewBox="0 0 100 40" className="w-full h-full p-1 opacity-50">
        <path
          d="M 90,10 H 10 V 20 H 90 V 30 H 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="text-blue-400 stroke-dasharray-[4_2]"
        />
        <circle r="2.5" className="fill-blue-600 shadow-sm">
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
  const [motorUrl, setMotorUrl] = useState("http://127.0.0.1:3001");

  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");

  // Manual motor control
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    setKeys(getGeminiKeysFromLocalStorage());
    setGeminiModel(getGeminiModelFromLocalStorage());
    setMotorUrl(getMotorServerUrl());
    setSensitivity(getMotorSensitivity());
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
      const stored = localStorage.getItem("MICROVIEW_MOTOR_SENSITIVITY");
      if (stored) setSensitivity(parseFloat(stored));
    }
  };

  const saveCalibration = async () => {
    setIsSaving(true);
    setMotorSensitivity(sensitivity);
    try {
      const res = await fetch(`${motorUrl}/update_config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sensitivity })
      });
      if (res.ok) {
        setIsConnected(true);
        setSavedAt(Date.now());
      } else {
        setSavedAt(Date.now());
      }
    } catch (e) {
      setSavedAt(Date.now());
      setIsConnected(false);
    } finally {
      setIsSaving(false);
    }
  };

  const manualMove = useCallback(async (axis: "x" | "y", direction: 1 | -1) => {
    setIsMoving(true);
    try {
      const res = await fetch(`${motorUrl}/manual_move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ axis, units: sensitivity * direction }),
      });
      if (res.ok) setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsMoving(false);
    }
  }, [motorUrl, sensitivity]);

  const manualHome = useCallback(async () => {
    setIsMoving(true);
    try {
      const res = await fetch(`${motorUrl}/manual_home`, { method: "POST" });
      if (res.ok) setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsMoving(false);
    }
  }, [motorUrl]);

  const manualZero = useCallback(async () => {
    setIsMoving(true);
    try {
      const res = await fetch(`${motorUrl}/manual_zero`, { method: "POST" });
      if (res.ok) setIsConnected(true);
    } catch {
      setIsConnected(false);
    } finally {
      setIsMoving(false);
    }
  }, [motorUrl]);

  useEffect(() => {
    if (!isConnected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (isMoving) return;
      switch (e.key.toLowerCase()) {
        case "arrowup": case "w": e.preventDefault(); manualMove("y", -1); break;
        case "arrowdown": case "s": e.preventDefault(); manualMove("y", 1); break;
        case "arrowleft": case "a": e.preventDefault(); manualMove("x", -1); break;
        case "arrowright": case "d": e.preventDefault(); manualMove("x", 1); break;
        case "h": manualHome(); break;
        case "z": manualZero(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConnected, isMoving, manualMove, manualHome, manualZero]);

  const cleanedKeys = useMemo(() => keys.map((k) => k.trim()).filter(Boolean).filter((k, i, arr) => arr.indexOf(k) === i), [keys]);

  function persist(next: string[]) {
    const cleaned = next.map((k) => k.trim()).filter(Boolean).filter((k, i, arr) => arr.indexOf(k) === i);
    setKeys(cleaned);
    localStorage.setItem(GEMINI_KEYS_STORAGE_KEY, JSON.stringify(cleaned));
    setSavedAt(Date.now());
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 border border-slate-200 transition-all font-bold"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-base font-bold leading-none tracking-tight">System Configuration</h1>
            <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-widest font-black opacity-70">Microview Core v2.5</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedAt && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-[9px] font-black text-slate-600 border border-slate-200 animate-in fade-in slide-in-from-right-2 duration-300">
              <CheckCircle className="h-3 w-3 text-green-500" />
              STATUS: UPDATED
            </div>
          )}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${isConnected ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100 shadow-inner'}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500 animate-pulse'}`} />
            {isConnected ? 'Actuators Ready' : 'Bridge Offline'}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 p-4 lg:p-6 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 overflow-hidden">
          
          {/* LEFT COLUMN: AI & INTELLIGENCE */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full max-h-full transition-all hover:shadow-md">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-blue-200 shadow-lg shrink-0">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-800">Intelligence Engine</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Vision Model & Keys</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1 min-h-0">
                <div className="mb-4 shrink-0">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                    Logic Core
                  </label>
                  <div className="relative">
                    <select
                      value={geminiModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGeminiModel(val);
                        localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, val);
                        setSavedAt(Date.now());
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all cursor-pointer appearance-none shadow-sm"
                    >
                      <optgroup label="Gemini 3 Series">
                        <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                        <option value="gemini-3.0-flash">Gemini 3.0 Flash</option>
                      </optgroup>
                      <optgroup label="Gemini 2.5 Series">
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      </optgroup>
                    </select>
                    <ArrowDown className="h-3 w-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">
                    Access Tokens
                  </label>
                  <div className="flex gap-2 mb-3 shrink-0">
                    <input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="API key..."
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-sm"
                    />
                    <Button
                      size="sm"
                      className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-md shadow-slate-200 font-bold text-[10px] uppercase tracking-wider transition-all active:scale-95"
                      onClick={() => {
                        const k = newKey.trim();
                        if (!k) return;
                        persist([...cleanedKeys, k]);
                        setNewKey("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                    {cleanedKeys.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 opacity-30 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                        <EyeOff className="h-6 w-6 mb-2 text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Repository Empty</span>
                      </div>
                    ) : (
                      cleanedKeys.map((k, idx) => {
                        const isVisible = visibleKeyIndex === idx;
                        return (
                          <div
                            key={`${k}-${idx}`}
                            className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 group transition-all hover:border-blue-200 hover:shadow-sm"
                          >
                            <div className="min-w-0 flex items-center gap-3">
                              <span className="text-[8px] font-black text-slate-300 uppercase shrink-0">#{idx + 1}</span>
                              <div className="text-xs font-mono text-slate-900 truncate tracking-tight font-medium">
                                {isVisible ? k : maskKey(k)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-lg hover:text-blue-600 border-slate-200"
                                onClick={() => setVisibleKeyIndex(isVisible ? null : idx)}
                              >
                                {isVisible ? <EyeOff className="h-3 h-3" /> : <Eye className="h-3 h-3" />}
                              </Button>
                              <Button
                                variant="outline"
                                className="h-7 w-7 p-0 rounded-lg hover:text-red-500 border-slate-200"
                                onClick={() => {
                                  const next = cleanedKeys.filter((_, i) => i !== idx);
                                  persist(next);
                                  if (visibleKeyIndex === idx) setVisibleKeyIndex(null);
                                }}
                              >
                                <Trash2 className="h-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: HARDWARE & CONTROLS */}
          <div className="flex flex-col min-h-0 overflow-hidden lg:pl-1 gap-4">
            
            {/* Bridge Controller */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 transition-all hover:shadow-md shrink-0">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${isConnected ? 'text-green-500' : 'text-amber-500 animate-spin-slow'}`} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bridge Interface</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={motorUrl}
                  onChange={(e) => setMotorUrl(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/30 text-[10px] font-mono text-slate-700 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all shadow-inner"
                />
                <Button
                  variant="outline"
                  className="h-9 px-3 rounded-lg border-slate-200 bg-white text-[9px] font-bold uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                  onClick={() => {
                    localStorage.setItem(MOTOR_SERVER_URL_STORAGE_KEY, motorUrl);
                    setSavedAt(Date.now());
                    fetchMotorConfig(motorUrl);
                  }}
                >
                  Link
                </Button>
              </div>

              <div className="pt-2 border-t border-slate-50 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sensitivity</span>
                  </div>
                  <div className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px] font-black shadow-md shadow-blue-100">
                    {sensitivity.toFixed(2)}x
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                  <input
                    type="range" min="0.1" max="5.0" step="0.05"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <input
                    type="number" step="0.1"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-12 h-7 text-center rounded bg-white border border-slate-200 text-[10px] font-black focus:ring-2 focus:ring-blue-600/10 outline-none"
                  />
                  <Button
                    size="sm"
                    className="h-7 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95 shrink-0"
                    onClick={saveCalibration}
                  >
                    Set
                  </Button>
                </div>
              </div>
            </div>

            {/* Tactical Jogging Hub */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 transition-all hover:shadow-md flex-1 flex flex-col min-h-0">
              <div className="flex items-center gap-2 mb-3 shrink-0">
                <Move className="h-3.5 w-3.5 text-slate-800" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tactical Jogging</span>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-center min-h-0">
                {/* D-Pad */}
                <div className="flex flex-col items-center justify-center shrink-0 py-1">
                  <div className="grid grid-cols-3 gap-2">
                    <div />
                    <Button
                      variant="outline"
                      disabled={isMoving || !isConnected}
                      onClick={() => manualMove("y", -1)}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-90 shadow border-b-2 hover:border-b-blue-600"
                    >
                      <ArrowUp className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
                    </Button>
                    <div />

                    <Button
                      variant="outline"
                      disabled={isMoving || !isConnected}
                      onClick={() => manualMove("x", -1)}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-90 shadow border-b-2 hover:border-b-blue-600"
                    >
                      <ArrowLeft className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
                    </Button>
                    <div className="h-10 w-10 md:h-12 md:w-12 flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-xl shadow-inner border-b">
                       <span className="text-[7px] font-black text-blue-600 leading-none">{sensitivity}x</span>
                    </div>
                    <Button
                      variant="outline"
                      disabled={isMoving || !isConnected}
                      onClick={() => manualMove("x", 1)}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-90 shadow border-b-2 hover:border-b-blue-600"
                    >
                      <ArrowRight className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
                    </Button>

                    <div />
                    <Button
                      variant="outline"
                      disabled={isMoving || !isConnected}
                      onClick={() => manualMove("y", 1)}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-90 shadow border-b-2 hover:border-b-blue-600"
                    >
                      <ArrowDown className="h-5 w-5 text-slate-700 group-hover:text-blue-600" />
                    </Button>
                    <div />
                  </div>
                </div>

                {/* Macro Controls & Path */}
                <div className="flex flex-col gap-3 min-h-0 h-full justify-center">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isMoving || !isConnected}
                      onClick={manualHome}
                      className="h-9 rounded-lg border-2 border-slate-100 hover:shadow hover:bg-orange-50 hover:border-orange-200 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 hover:border-b-orange-400"
                    >
                      <Home className="h-3 w-3 mr-1" /> Home
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isMoving || !isConnected}
                      onClick={manualZero}
                      className="h-9 rounded-lg border-2 border-slate-100 hover:shadow hover:bg-green-50 hover:border-green-200 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 hover:border-b-green-400"
                    >
                      <Crosshair className="h-3 w-3 mr-1" /> Zero
                    </Button>
                  </div>

                  <div className="flex-1 min-h-[60px] rounded-xl border border-slate-100 bg-slate-50/50 p-3 relative overflow-hidden shadow-inner flex flex-col justify-center">
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-50">
                       <Microscope className="h-2.5 w-2.5 text-slate-400" />
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Scanning Pattern</span>
                    </div>
                    <ScanningIllustration />
                    {isMoving && (
                       <div className="absolute inset-x-0 bottom-0 py-1 bg-blue-600 flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-300">
                          <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-[7px] font-black text-white uppercase tracking-[0.2em]">Engaged</span>
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
