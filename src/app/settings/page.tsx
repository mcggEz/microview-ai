"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  GEMINI_KEYS_STORAGE_KEY,
  getGeminiKeysFromLocalStorage,
} from "@/lib/client-gemini-keys";
import {
  MOTOR_SERVER_URL_STORAGE_KEY,
  getMotorServerUrl,
  setMotorServerUrl,
} from "@/lib/motor-config";
import {
  SCAN_METHOD_STORAGE_KEY,
  getScanMethodFromLocalStorage,
  type ScanMethod,
} from "@/lib/scan-method";
import { Cpu, Eye, EyeOff, Plus, Trash2, ArrowLeft, Microscope, RefreshCw, CheckCircle, ArrowUp, ArrowDown, ArrowLeft as LeftIcon, ArrowRight, Home, Gauge, Save } from "lucide-react";

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
  const [scanMethod, setScanMethod] = useState<ScanMethod>("longitudinal");
  const [motorUrl, setMotorUrl] = useState("http://127.0.0.1:3001");

  const [gridParams, setGridParams] = useState<any>(null);
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [motorStatus, setMotorStatus] = useState<any>(null);

  useEffect(() => {
    setKeys(getGeminiKeysFromLocalStorage());
    setScanMethod(getScanMethodFromLocalStorage());
    setMotorUrl(getMotorServerUrl());
    fetchMotorConfig();
  }, []);

  const fetchMotorConfig = async () => {
    try {
      const res = await fetch(`${getMotorServerUrl()}/get_config`);
      if (res.ok) {
        const data = await res.json();
        setGridParams(data.grid_params);
        setSensitivity(data.sensitivity || 1.0);
      }
    } catch (e) {
      console.warn("Failed to fetch motor config", e);
    }
  };

  const updateGridParam = (field: 'lpf' | 'hpf', key: string, value: number) => {
    setGridParams((prev: any) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [key]: value
      }
    }));
  };

  const saveCalibration = async () => {
    try {
      const res = await fetch(`${getMotorServerUrl()}/update_config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          grid_params: gridParams,
          sensitivity: sensitivity
        })
      });
      if (res.ok) {
        setSavedAt(Date.now());
      }
    } catch (e) {
      alert("Failed to save calibration. Check motor server connection.");
    }
  };


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

        {/* Scanning Method Configuration */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start gap-3">
            <Microscope className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Scanning Method
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                Choose how the motorized stage moves across the slide to collect
                samples. This affects X/Y motor movement patterns.
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Longitudinal */}
            <button
              onClick={() => {
                setScanMethod("longitudinal");
                localStorage.setItem(SCAN_METHOD_STORAGE_KEY, "longitudinal");
                setSavedAt(Date.now());
              }}
              className={`relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-300 shadow-sm hover:shadow-md ${
                scanMethod === "longitudinal"
                  ? "border-blue-600 bg-blue-50/30"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${scanMethod === 'longitudinal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </div>
                  Longitudinal Strip
                </div>
                {scanMethod === "longitudinal" && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    <CheckCircle className="h-2.5 w-2.5" /> Active
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 leading-relaxed min-h-[40px]">
                Stage scans side-to-side in a <strong>serpentine meander</strong> pattern. 
                Optimized for fast coverage of the entire smear.
              </div>
              
              {/* SVG Illustration: Longitudinal */}
              <div className="relative mt-2 w-full rounded-xl bg-white border border-gray-100 p-4 overflow-hidden h-32 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 200 80" className="drop-shadow-sm">
                  {/* Path */}
                  <path 
                    d="M 20 25 L 180 25 C 185 25 185 55 180 55 L 20 55" 
                    fill="none" 
                    stroke={scanMethod === 'longitudinal' ? '#2563eb' : '#cbd5e1'} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="0.1 8"
                  />
                  <path 
                    d="M 20 25 L 180 25 C 185 25 185 55 180 55 L 20 55" 
                    fill="none" 
                    stroke={scanMethod === 'longitudinal' ? '#3b82f6' : '#94a3b8'} 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                  />
                  
                  {/* Nodes Row 1 */}
                  {[20, 60, 100, 140, 180].map((x, i) => (
                    <g key={`L1-${i}`}>
                      <circle cx={x} cy="25" r="5" fill="white" stroke={scanMethod === 'longitudinal' ? '#2563eb' : '#94a3b8'} strokeWidth="1.5" />
                      <text x={x} y="28.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill={scanMethod === 'longitudinal' ? '#2563eb' : '#64748b'}>{i + 1}</text>
                    </g>
                  ))}
                  
                  {/* Nodes Row 2 */}
                  {[180, 140, 100, 60, 20].map((x, i) => (
                    <g key={`L2-${i}`}>
                      <circle cx={x} cy="55" r="5" fill="white" stroke={scanMethod === 'longitudinal' ? '#2563eb' : '#94a3b8'} strokeWidth="1.5" />
                      <text x={x} y="58.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill={scanMethod === 'longitudinal' ? '#2563eb' : '#64748b'}>{i + 6}</text>
                    </g>
                  ))}
                  
                  {/* Directional Arrows */}
                  <path d="M 90 25 L 94 25 M 92 23 L 94 25 L 92 27" stroke="#3b82f6" strokeWidth="1" fill="none" />
                  <path d="M 110 55 L 106 55 M 108 53 L 106 55 L 108 57" stroke="#3b82f6" strokeWidth="1" fill="none" />
                </svg>
              </div>
            </button>

            {/* Battlement */}
            <button
              onClick={() => {
                setScanMethod("battlement");
                localStorage.setItem(SCAN_METHOD_STORAGE_KEY, "battlement");
                setSavedAt(Date.now());
              }}
              className={`relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-300 shadow-sm hover:shadow-md ${
                scanMethod === "battlement"
                  ? "border-blue-600 bg-blue-50/30"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${scanMethod === 'battlement' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Microscope className="h-3.5 w-3.5" />
                  </div>
                  Battlement Pattern
                </div>
                {scanMethod === "battlement" && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    <CheckCircle className="h-2.5 w-2.5" /> Active
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-600 leading-relaxed min-h-[40px]">
                Stage moves in a <strong>square-wave</strong> (castle-top) pattern. 
                Ideal for scanning edges where crystals often settle.
              </div>
              
              {/* SVG Illustration: Battlement */}
              <div className="relative mt-2 w-full rounded-xl bg-white border border-gray-100 p-4 overflow-hidden h-32 flex items-center justify-center">
                <svg width="100%" height="100%" viewBox="0 0 200 80" className="drop-shadow-sm">
                  {/* Path */}
                  <path 
                    d="M 20 60 L 20 20 L 60 20 L 60 60 L 100 60 L 100 20 L 140 20 L 140 60 L 180 60 L 180 20" 
                    fill="none" 
                    stroke={scanMethod === 'battlement' ? '#2563eb' : '#cbd5e1'} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="0.1 8"
                  />
                  <path 
                    d="M 20 60 L 20 20 L 60 20 L 60 60 L 100 60 L 100 20 L 140 20 L 140 60 L 180 60 L 180 20" 
                    fill="none" 
                    stroke={scanMethod === 'battlement' ? '#3b82f6' : '#94a3b8'} 
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.3"
                  />
                  
                  {/* Nodes */}
                  {[
                    {x: 20, y: 60, id: 1}, {x: 20, y: 20, id: 2}, 
                    {x: 60, y: 20, id: 3}, {x: 60, y: 60, id: 4}, 
                    {x: 100, y: 60, id: 5}, {x: 100, y: 20, id: 6}, 
                    {x: 140, y: 20, id: 7}, {x: 140, y: 60, id: 8}, 
                    {x: 180, y: 60, id: 9}, {x: 180, y: 20, id: 10}
                  ].map((pt, i) => (
                    <g key={`B-${i}`}>
                      <circle cx={pt.x} cy={pt.y} r="5" fill="white" stroke={scanMethod === 'battlement' ? '#2563eb' : '#94a3b8'} strokeWidth="1.5" />
                      <text x={pt.x} y={pt.y + 3.5} textAnchor="middle" fontSize="6" fontWeight="bold" fill={scanMethod === 'battlement' ? '#2563eb' : '#64748b'}>{pt.id}</text>
                    </g>
                  ))}
                  
                  {/* Directional Arrows */}
                  <path d="M 20 40 L 20 36 M 18 38 L 20 36 L 22 38" stroke="#3b82f6" strokeWidth="1" fill="none" />
                  <path d="M 40 20 L 44 20 M 42 18 L 44 20 L 42 22" stroke="#3b82f6" strokeWidth="1" fill="none" />
                </svg>
              </div>
            </button>
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
                  The address of the Flask motor backend. Use 127.0.0.1 for local or the Raspberry Pi&apos;s IP.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              value={motorUrl}
              onChange={(e) => setMotorUrl(e.target.value)}
              placeholder="http://127.0.0.1:3001"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-purple-900/10 focus:border-purple-400 font-mono"
            />
            <Button
              className="h-10 px-4 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              onClick={() => {
                localStorage.setItem(MOTOR_SERVER_URL_STORAGE_KEY, motorUrl);
                setSavedAt(Date.now());
              }}
            >
              Update URL
            </Button>
          </div>
          {savedAt && (
            <div className="mt-2 text-[10px] text-green-600 font-medium">
              Changes saved successfully!
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
          <div className="text-amber-600 mt-0.5">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="text-xs text-amber-800 leading-relaxed">
            <strong>Deployment Tip:</strong> If your microscope is connected to a <strong>Raspberry Pi</strong>, 
            enter the Pi&apos;s network address (e.g., <code>http://192.168.1.5:3001</code>) above so the browser 
            can send commands to the hardware.
          </div>
        </div>

        {/* Motor Calibration */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-start gap-3 mb-4">
            <Gauge className="h-5 w-5 text-gray-700 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Motor & Stage Calibration
              </div>
              <div className="text-xs text-gray-600 mt-1 leading-relaxed">
                Fine-tune the scan area and movement sensitivity. These settings are saved to the motor server.
              </div>
            </div>
          </div>

          {!gridParams ? (
            <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500 italic">
              Connect to motor server to edit calibration range...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sensitivity Calibration */}
              <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/20 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Travel Sensitivity (Multiplier)</div>
                  <div className="px-3 py-1 rounded-md bg-blue-600 text-white font-mono text-xs font-bold leading-none">
                    {sensitivity?.toFixed(2) || "1.00"}x
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="0.1" max="5.0" step="0.05"
                    value={sensitivity || 1.0}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <input 
                    type="number" step="0.01"
                    value={sensitivity || 1.0}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-20 h-9 text-center rounded-lg border-2 border-blue-100 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="mt-2 text-[10px] text-gray-500 italic">
                  * Adjust this if the motor travels more or less than the expected distance (e.g., set to 2.0 to double the travel).
                </div>
              </div>

              {(['lpf', 'hpf'] as const).map((field) => (
                <div key={field} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center justify-between">
                    {field === 'lpf' ? 'Low Power Field (LPF)' : 'High Power Field (HPF)'}
                    <span className="text-[10px] lowercase font-normal opacity-70">Grid units in mm</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">Start X</label>
                      <input
                        type="number" step="0.1"
                        value={gridParams[field].start_x}
                        onChange={(e) => updateGridParam(field, 'start_x', parseFloat(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">End X</label>
                      <input
                        type="number" step="0.1"
                        value={gridParams[field].end_x}
                        onChange={(e) => updateGridParam(field, 'end_x', parseFloat(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">Cols</label>
                      <input
                        type="number"
                        value={gridParams[field].cols}
                        onChange={(e) => updateGridParam(field, 'cols', parseInt(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">Start Y</label>
                      <input
                        type="number" step="0.1"
                        value={gridParams[field].start_y}
                        onChange={(e) => updateGridParam(field, 'start_y', parseFloat(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">End Y</label>
                      <input
                        type="number" step="0.1"
                        value={gridParams[field].end_y}
                        onChange={(e) => updateGridParam(field, 'end_y', parseFloat(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">Rows</label>
                      <input
                        type="number"
                        value={gridParams[field].rows}
                        onChange={(e) => updateGridParam(field, 'rows', parseInt(e.target.value))}
                        className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                onClick={saveCalibration}
                className="w-full h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Apply & Save Calibration
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 text-[11px] text-gray-500 text-center pb-8">
          Note: these settings are stored in this browser session. Clearing cache will reset these values.
        </div>
      </div>
    </div>
  );
}
