"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  imageAlt: string;
  title: string;
}

export default function ImageModal({
  isOpen,
  onClose,
  imageSrc,
  imageAlt,
  title,
}: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        <div className="p-3 md:p-4 bg-gray-50">
          {imageSrc.startsWith("data:") ? (
            // Handle base64 images
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={800}
              height={600}
              className="w-full h-auto max-h-[75vh] object-contain rounded-md bg-black"
              unoptimized={imageSrc.startsWith("http")}
            />
          ) : (
            // Handle URL images
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={800}
              height={600}
              className="w-full h-auto max-h-[75vh] object-contain rounded-md bg-black"
              unoptimized={imageSrc.startsWith("http")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
