"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Microscope, ArrowRight, RotateCw, CheckCircle2 } from "lucide-react";

interface ObjectiveSwitchModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  fromObjective?: "LPF" | "HPF";
  toObjective?: "LPF" | "HPF";
}

export default function ObjectiveSwitchModal({
  isOpen,
  onConfirm,
  onCancel,
  fromObjective = "LPF",
  toObjective = "HPF",
}: ObjectiveSwitchModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md bg-white rounded-2xl border-none shadow-2xl p-0 overflow-hidden [&>button]:hidden">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 animate-pulse">
            <RotateCw className="h-10 w-10 text-white" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-white">
              Switch Objective
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-sm mt-2 font-medium">
              Hardware rotation required to continue analysis
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-gray-400">{fromObjective}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Done</span>
            </div>
            
            <ArrowRight className="h-6 w-6 text-blue-500 animate-bounce-x" />
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center shadow-md ring-4 ring-blue-50">
                <span className="text-lg font-black text-blue-600">{toObjective}</span>
              </div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Active</span>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-8">
            <div className="flex gap-3">
              <Microscope className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Manually rotate the microscope turret to the <strong className="text-amber-900">{toObjective}</strong> objective. Ensure it clicks into place before proceeding.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              onClick={onConfirm}
              className="w-full h-12 bg-gray-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <CheckCircle2 className="h-5 w-5" />
              I&apos;ve Switched to {toObjective}
            </Button>
            <Button 
              variant="ghost"
              onClick={onCancel}
              className="w-full h-10 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl font-semibold transition-colors"
            >
              Cancel Scan
            </Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Motorized Stage Standby</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
