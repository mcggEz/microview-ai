'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Move, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  Crosshair, 
  X,
  Keyboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMotorSensitivity } from '@/lib/motor-config';

interface ManualMotorControlProps {
  show: boolean;
  onClose: () => void;
  motorUrl: string;
}

export default function ManualMotorControl({
  show,
  onClose,
  motorUrl,
}: ManualMotorControlProps) {
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStatus, setMoveStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const [activeButton, setActiveButton] = useState<string | null>(null);

  // Load sensitivity on mount/show
  useEffect(() => {
    if (show) {
      setSensitivity(getMotorSensitivity());
    }
  }, [show]);

  const manualMove = useCallback(async (axis: 'x' | 'y', direction: 1 | -1) => {
    const btnKey = `${axis}${direction}`;
    setActiveButton(btnKey);
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ axis, units: sensitivity * direction }),
      });
      const data = await res.json();
      if (res.ok) {
        setMoveStatus({ type: 'success', msg: `Moved ${axis.toUpperCase()} ${direction > 0 ? '+' : '−'}${sensitivity}` });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: 'error', msg: data.message || 'Move failed' });
      }
    } catch {
      setMoveStatus({ type: 'error', msg: 'Motor server offline' });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setActiveButton(null), 150);
    }
  }, [motorUrl, sensitivity]);

  const manualHome = useCallback(async () => {
    setActiveButton('home');
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_home`, { method: 'POST' });
      if (res.ok) {
        setMoveStatus({ type: 'success', msg: 'Motors returned home' });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: 'error', msg: 'Home failed' });
      }
    } catch {
      setMoveStatus({ type: 'error', msg: 'Motor server offline' });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setActiveButton(null), 150);
    }
  }, [motorUrl]);

  const manualZero = useCallback(async () => {
    setActiveButton('zero');
    setIsMoving(true);
    setMoveStatus(null);
    try {
      const res = await fetch(`${motorUrl}/manual_zero`, { method: 'POST' });
      if (res.ok) {
        setMoveStatus({ type: 'success', msg: 'Origin set to current position' });
        setIsConnected(true);
      } else {
        setMoveStatus({ type: 'error', msg: 'Zero failed' });
      }
    } catch {
      setMoveStatus({ type: 'error', msg: 'Motor server offline' });
      setIsConnected(false);
    } finally {
      setIsMoving(false);
      setTimeout(() => setActiveButton(null), 150);
    }
  }, [motorUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (isMoving) return;

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          e.preventDefault();
          manualMove('y', -1);
          break;
        case 'arrowdown':
        case 's':
          e.preventDefault();
          manualMove('y', 1);
          break;
        case 'arrowleft':
        case 'a':
          e.preventDefault();
          manualMove('x', -1);
          break;
        case 'arrowright':
        case 'd':
          e.preventDefault();
          manualMove('x', 1);
          break;
        case 'h':
          manualHome();
          break;
        case 'z':
          manualZero();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, isMoving, manualMove, manualHome, manualZero]);

  // Auto-clear success message
  useEffect(() => {
    if (moveStatus?.type === 'success') {
      const timer = setTimeout(() => setMoveStatus(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [moveStatus]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-40">
      <div className="flex flex-col rounded-xl border border-gray-200 bg-white/95 backdrop-blur-sm shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1 bg-gray-900 text-white">
          <div className="flex items-center gap-1">
            <Move className="h-3 w-3" />
            <span className="text-[9px] font-bold tracking-tight">Manual Jog</span>
          </div>
          <button onClick={onClose} className="hover:bg-gray-800 p-0.5 rounded-md transition-colors">
            <X className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-2 space-y-2">
          {/* D-Pad */}
          <div className="flex flex-col items-center gap-0.5 py-0.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isMoving}
              onClick={() => manualMove('y', -1)}
              className={`h-8 w-8 p-0 rounded-lg border-2 transition-all ${
                activeButton === 'y-1'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <div className="flex gap-0.5">
              <Button
                variant="outline"
                size="sm"
                disabled={isMoving}
                onClick={() => manualMove('x', -1)}
                className={`h-8 w-8 p-0 rounded-lg border-2 transition-all ${
                  activeButton === 'x-1'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="h-8 w-8 flex items-center justify-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                <span className="text-[7px] font-bold text-gray-400">{sensitivity}x</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={isMoving}
                onClick={() => manualMove('x', 1)}
                className={`h-8 w-8 p-0 rounded-lg border-2 transition-all ${
                  activeButton === 'x1'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isMoving}
              onClick={() => manualMove('y', 1)}
              className={`h-8 w-8 p-0 rounded-lg border-2 transition-all ${
                activeButton === 'y1'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Home/Zero */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              disabled={isMoving}
              onClick={manualHome}
              className={`h-6.5 px-0 rounded-lg border-2 transition-all text-gray-700 ${
                activeButton === 'home'
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-gray-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-100'
              }`}
              title="Home"
            >
              <Home className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isMoving}
              onClick={manualZero}
              className={`h-6.5 px-0 rounded-lg border-2 transition-all text-gray-700 ${
                activeButton === 'zero'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-gray-100 hover:bg-green-50 hover:text-green-600 hover:border-green-100'
              }`}
              title="Zero"
            >
              <Crosshair className="h-3 w-3" />
            </Button>
          </div>

          {/* Status Message Area - Fixed height to prevent layout shift */}
          <div className="h-6 flex items-center justify-center">
            {(isMoving || moveStatus) && (
              <div className={`w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border text-[8px] font-bold transition-all animate-in fade-in zoom-in-95 duration-200 ${
                moveStatus?.type === 'success' 
                ? 'bg-green-50 text-green-700 border-green-100' 
                : moveStatus?.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-100'
                : 'bg-gray-50 text-gray-600 border-gray-100'
              }`}>
                {isMoving && <span className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />}
                <span className="truncate">{isMoving ? 'Moving...' : moveStatus?.msg}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
