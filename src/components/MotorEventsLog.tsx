'use client';

import { ClipboardList, X } from 'lucide-react';

export type MotorEvent = {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error';
};

interface MotorEventsLogProps {
  show: boolean;
  events: MotorEvent[];
  running: boolean;
  onClear: () => void;
  onClose: () => void;
}

export default function MotorEventsLog({
  show,
  events,
  running,
  onClear,
  onClose,
}: MotorEventsLogProps) {
  if (!show) return null;

  const hasError = events.some((e) => e.type === 'error');
  const showIndicator = running || events.length > 0;

  const indicatorClass = [
    'ml-1 h-2 w-2 rounded-full',
    hasError ? 'bg-red-500 animate-pulse' : running ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300',
  ].join(' ');

  return (
    <div className="fixed top-16 right-4 z-[9998] w-80">
      <div className="flex flex-col rounded-md border border-gray-300 bg-white shadow-lg">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-800 tracking-tight">
              Motor Events
            </span>
            {showIndicator && <span className={indicatorClass} />}
          </div>
          <div className="flex items-center gap-2">
            {events.length > 0 && (
              <button
                onClick={onClear}
                className="text-[10px] text-gray-500 hover:text-gray-800"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800"
              aria-label="Close motor events"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto px-3 py-2 space-y-1">
          {events.length === 0 ? (
            <p className="text-[11px] text-gray-500">
              No events yet. Click <span className="font-semibold">Get Samples</span> to start the
              routine.
            </p>
          ) : (
            events.map((event, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 rounded-md px-2 py-1 ${
                  event.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-100'
                    : event.type === 'error'
                    ? 'bg-red-50 border border-red-100'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-gray-700">
                      {event.message}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-400">{event.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

