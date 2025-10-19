"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, RotateCcw, Check } from "lucide-react";
import Image from "next/image";

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !stream) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, stream]);

  const startCamera = async () => {
    try {
      setError(null);
      setIsLoading(true);
      console.log("Starting camera...");

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log("Camera stream obtained:", mediaStream);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("Video element updated with stream");

        // Add event listeners to debug video loading
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded");
        };
        videoRef.current.oncanplay = () => {
          console.log("Video can play");
          setIsLoading(false);
        };
        videoRef.current.onerror = (e) => {
          console.error("Video error:", e);
          setIsLoading(false);
          setError("Video playback error");
        };
      } else {
        console.error("Video ref is null");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsLoading(false);
      setError(
        "Unable to access camera. Please check permissions and try again."
      );
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black">
      <div className="h-full flex flex-col">
        {/* Content */}
        <div className="flex-1 flex flex-col">
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 text-red-400" />
                <p className="text-lg mb-6">{error}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 relative bg-black">
                <Image
                  src={capturedImage}
                  alt="Captured specimen"
                  width={1920}
                  height={1080}
                  className="w-full h-full object-contain"
                  unoptimized
                />
              </div>
              <div className="bg-black bg-opacity-80 p-4">
                <div className="flex space-x-4">
                  <button
                    onClick={retakePhoto}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-medium"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    onClick={confirmCapture}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-medium"
                  >
                    <Check className="h-5 w-5" />
                    <span>Use This Image</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 relative bg-black z-10">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Camera className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                    <p className="text-lg">Starting camera...</p>
                  </div>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ display: isLoading ? "none" : "block" }}
              />

              {/* Back button - top left corner */}
              <button
                onClick={handleClose}
                className="fixed top-4 left-4 bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200 p-2.5 rounded-full z-[10000] backdrop-blur-md border border-white border-opacity-20 hover:border-opacity-30 shadow-xl"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Take Sample button - bottom center, overlaid on video */}
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[10000]">
                <button
                  onClick={captureImage}
                  disabled={!stream}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-black bg-opacity-50 text-white rounded-xl hover:bg-opacity-70 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium shadow-xl backdrop-blur-md border border-white border-opacity-20 hover:border-opacity-30"
                >
                  <Camera className="h-4 w-4" />
                  <span>Take Sample</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
