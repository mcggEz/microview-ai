"use client";

import React, { useRef, useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import BoundingBoxOverlay from "./BoundingBoxOverlay";

interface FullScreenImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  title: string;
  detections: any[];
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const LEGEND_ITEMS = [
  { label: 'RBC', color: '#00FFFF' },
  { label: 'WBC', color: '#FFA500' },
  { label: 'EPITH', color: '#FF00FF' },
  { label: 'CRYST', color: '#FFFF00' },
  { label: 'CAST', color: '#00FF00' },
  { label: 'BACT/YST', color: '#FF5555' },
  { label: 'SPRM', color: '#AAAAAA' },
  { label: 'PARA', color: '#800080' },
];

export default function FullScreenImageModal({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  title,
  detections,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: FullScreenImageModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const resetZoom = () => {
    if (containerRef.current && imageRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      const img = imageRef.current;
      
      if (!img.naturalWidth || !container.width) return;

      // Calculate the scale required to fit the image perfectly within the container
      const scaleW = container.width / img.naturalWidth;
      const scaleH = container.height / img.naturalHeight;
      
      // Focus on making the image large enough to see (95% of the limiting dimension)
      const initialScale = Math.min(scaleW, scaleH) * 0.95;
      
      setScale(initialScale);
      setPosition({
        x: (container.width - img.naturalWidth * initialScale) / 2,
        y: (container.height - img.naturalHeight * initialScale) / 2
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure image is rendered/loaded for rect calculation
      const timer = setTimeout(resetZoom, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, imageSrc]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.5, 8);
    // Zoom from center if using buttons
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      updateZoom(newScale, rect.width / 2, rect.height / 2);
    }
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.5, 0.7);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      updateZoom(newScale, rect.width / 2, rect.height / 2);
    }
  };

  const updateZoom = (newScale: number, mouseX: number, mouseY: number) => {
    if (newScale === scale) return;
    
    // Zoom focal point logic
    const ratio = newScale / scale;
    const newX = mouseX - (mouseX - position.x) * ratio;
    const newY = mouseY - (mouseY - position.y) * ratio;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.2;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.max(0.7, Math.min(scale + delta, 8));

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    updateZoom(newScale, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-gray-50 flex flex-col animate-in fade-in duration-200 select-none overflow-hidden font-sans">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 z-[10001]">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h3 className="text-gray-500 font-mono text-[10px] tracking-[0.3em] uppercase leading-none mb-1.5">
              Field Analysis
            </h3>
            <div className="text-gray-950 font-black text-sm tracking-tight truncate max-w-[200px]">
              {title}
            </div>
          </div>

          <div className="h-10 w-px bg-gray-200 hidden md:block" />

          {/* Compact Legend - Enhanced Visibility */}
          <div className="hidden lg:flex items-center gap-6">
            {LEGEND_ITEMS.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-bold text-gray-800 tracking-tight uppercase">{item.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-6">
               <div className="w-3.5 h-3.5 rounded-sm border-2 border-dashed border-gray-400" />
               <span className="text-[11px] font-bold text-gray-500 tracking-tight uppercase">Manual</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
               {/* Minimalist Zoom Controls */}
               <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    <button onClick={handleZoomOut} className="p-1.5 text-gray-400 hover:text-gray-900 transition-all rounded hover:bg-white">
                         <ZoomOut className="w-4 h-4" />
                    </button>
                    <div className="px-3 text-[10px] font-mono font-black text-blue-600 tabular-nums min-w-[3.5rem] text-center">
                         {Math.round(scale * 100)}%
                    </div>
                    <button onClick={handleZoomIn} className="p-1.5 text-gray-400 hover:text-gray-900 transition-all rounded hover:bg-white">
                         <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1" />
                    <button onClick={resetZoom} className="p-1.5 text-gray-400 hover:text-gray-900 transition-all rounded hover:bg-white" title="Reset View">
                         <RotateCcw className="w-4 h-4" />
                    </button>
               </div>

               <div className="h-6 w-px bg-gray-200 hidden sm:block" />

               {/* Field Navigation Arrows */}
               <div className="flex items-center gap-1 group bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    <button
                         onClick={onPrev}
                         disabled={!hasPrev}
                         className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-10 disabled:cursor-not-allowed transition-all rounded hover:bg-white"
                         title="Previous Field"
                    >
                         <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="h-4 w-px bg-gray-200 mx-1" />
                    <button
                         onClick={onNext}
                         disabled={!hasNext}
                         className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-10 disabled:cursor-not-allowed transition-all rounded hover:bg-white"
                         title="Next Field"
                    >
                         <ChevronRight className="w-5 h-5" />
                    </button>
               </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Analysis Viewport */}
      <div 
        ref={containerRef}
        className={`relative flex-1 ${scale >= 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"} overflow-hidden bg-gray-100`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          className="absolute origin-top-left will-change-transform"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        >
          <div className="relative">
            <img
              ref={imageRef}
              src={imageSrc}
              alt={imageAlt}
              className="max-w-none shadow-xl border border-gray-200 bg-white"
              style={{ display: 'block' }}
              draggable={false}
              onLoad={resetZoom}
            />
            
            <BoundingBoxOverlay
              imageRef={imageRef}
              detections={detections}
              highlightedDetectionId={null}
              showBoundingBoxes={true}
              refreshTrigger={scale}
            />
          </div>
        </div>
      </div>
      
      {/* Mobile Legend */}
      <div className="lg:hidden flex flex-wrap justify-center gap-3 px-6 py-2 bg-gray-50 border-t border-gray-200">
        {LEGEND_ITEMS.slice(0, 4).map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: item.color }} />
            <span className="text-[8px] font-bold text-gray-500 tracking-tighter uppercase">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
