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
    <div className="fixed inset-0 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="p-4">
          {imageSrc.startsWith("data:") ? (
            // Handle base64 images
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={800}
              height={600}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              unoptimized={imageSrc.startsWith("http")}
            />
          ) : (
            // Handle URL images
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={800}
              height={600}
              className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              unoptimized={imageSrc.startsWith("http")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
