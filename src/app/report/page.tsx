"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  Suspense,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useDashboard, type AddPatientWithTestInput } from "@/hooks/useDashboard";
import {
  updatePatient,
  updateTest,
  deleteTest,
} from "@/lib/api-client";
import {
  deleteImageFromTest,
  deleteImageFromStorage,
  addImageToTest,
  uploadImageToStorage,
  getImageAnalysisByIndex,
  upsertImageAnalysis,
  deleteImageAnalysisByImage,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { LPFSedimentDetection, HPFSedimentDetection } from "@/lib/gemini";
import {
  Calendar,
  Microscope,
  Edit,
  CheckCircle,
  Save,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  RefreshCw,
  Settings,
  BookOpenCheck,
  FileSearch,
  ClipboardList,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import ImageModal from "@/components/ImageModal";
import Notification from "@/components/Notification";
import StrasingerReferenceTable from "@/components/StrasingerReferenceTable";
import YOLODetectionOverlay from "@/components/YOLODetectionOverlay";
import BoundingBoxOverlay from "@/components/BoundingBoxOverlay";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function Report() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [modalImage, setModalImage] = useState<{
    src: string;
    alt: string;
    title: string;
  } | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    patientName: "",
    patientAge: "",
    patientGender: "male" as "male" | "female" | "other",
    collectionTime: "",
    technician: "",
  });
  const [saving, setSaving] = useState(false);
  const [focusMode, setFocusMode] = useState<"field" | "report">("field"); // Focus mode for UI
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "warning" | "info"
  >("success");

  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<{ full_name?: string; email?: string } | null>(null);

  // Check authentication and load user data on mount
  useEffect(() => {
    const checkAuth = async () => {
    const userData = localStorage.getItem('user');
      
      // If no user data in localStorage, redirect to login
      if (!userData) {
        router.push('/login?redirect=/report');
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Verify session is still valid by making a simple API call
        // If the API call fails with 401, redirect to login
        try {
          const response = await fetch('/api/patients', {
            credentials: 'include'
          });
          
          if (response.status === 401) {
            // Session expired or invalid, redirect to login
            localStorage.removeItem('user');
            router.push('/login?redirect=/report');
            return;
          }
        } catch (error) {
          // Network error or other issue, but we have user data so continue
          console.warn('Could not verify session, but user data exists:', error);
        }
      } catch (e) {
        console.error('Failed to parse user data:', e);
        localStorage.removeItem('user');
        router.push('/login?redirect=/report');
        return;
      }
    };

    checkAuth();
  }, [router]);

  const [showStrasingerModal, setShowStrasingerModal] = useState(false);
  const strasingerButtonRef = useRef<HTMLButtonElement>(null);
  const strasingerDropdownRef = useRef<HTMLDivElement>(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showStrasingerModal &&
        strasingerButtonRef.current &&
        strasingerDropdownRef.current &&
        !strasingerButtonRef.current.contains(event.target as Node) &&
        !strasingerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStrasingerModal(false);
      }
    };

    if (showStrasingerModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStrasingerModal]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSettingsDropdown &&
        settingsButtonRef.current &&
        settingsDropdownRef.current &&
        !settingsButtonRef.current.contains(event.target as Node) &&
        !settingsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSettingsDropdown(false);
      }
    };

    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHeader] = useState(true);
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const lpfImageRef = useRef<HTMLImageElement | null>(null);
  const hpfImageRef = useRef<HTMLImageElement | null>(null);
  const [powerMode, setPowerMode] = useState<"high" | "low">("low");
  const [highPowerImages, setHighPowerImages] = useState<string[]>([]);
  const [lowPowerImages, setLowPowerImages] = useState<string[]>([]);
  const [currentLPFIndex, setCurrentLPFIndex] = useState(0);
  const [currentHPFIndex, setCurrentHPFIndex] = useState(0);
  const [dateParam, setDateParam] = useState<string | null>(null);
  const [confThreshold, setConfThreshold] = useState(0.25);
  const [detectionInterval, setDetectionInterval] = useState(500); // ms between detections
  const [showOverlay, setShowOverlay] = useState(true);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [showCrystalName, setShowCrystalName] = useState(true);
  
  // YOLO detections and cropped images state
  const [lpfYoloDetections, setLpfYoloDetections] = useState<{
    predictions: Array<{
      x: number
      y: number
      width: number
      height: number
      confidence: number
      class: string
      class_id: number
      detection_id: string
    }>
    summary: {
      total_detections: number
      by_class: Record<string, number>
    }
  } | null>(null)
  const [hpfYoloDetections, setHpfYoloDetections] = useState<{
    predictions: Array<{
      x: number
      y: number
      width: number
      height: number
      confidence: number
      class: string
      class_id: number
      detection_id: string
    }>
    summary: {
      total_detections: number
      by_class: Record<string, number>
    }
  } | null>(null)
  const [lpfCroppedImages, setLpfCroppedImages] = useState<Record<string, string>>({}) // detection_id -> base64 cropped image
  const [hpfCroppedImages, setHpfCroppedImages] = useState<Record<string, string>>({})
  const [highlightedDetection, setHighlightedDetection] = useState<string | null>(null) // detection_id to highlight

  const {
    patients,
    selectedPatient,
    tests,
    selectedTest,
    loading,
    error,
    setSelectedTest,
    setSelectedPatient,
    clearError,
    preloadByDate,
    addPatientWithTest,
    loadTestsForPatient,
    loadPatients,
  } = useDashboard();

  const attachStreamToVideo = useCallback(
    (videoElement: HTMLVideoElement, streamToAttach: MediaStream) => {
      const elementWithSrcObject = videoElement as HTMLVideoElement & {
        srcObject: MediaStream | null;
      };
      elementWithSrcObject.srcObject = streamToAttach;
    },
    []
  );

  // Text-only Urinalysis Summary
  const [urinalysisText, setUrinalysisText] = useState({
    color: "",
    transparency: "",
    specificGravity: "",
    ph: "",
    protein: "",
    glucose: "",
    rbc: "",
    pusCells: "",
    epithelialCells: "",
    bacteria: "",
    remarks: "",
  });

  const updateUrinalysisText = (
    key: keyof typeof urinalysisText,
    value: string
  ) => {
    setUrinalysisText((prev) => ({ ...prev, [key]: value }));
  };

  // LPF Sediment Detection state - per image
  const [lpfSedimentDetection, setLpfSedimentDetection] =
    useState<LPFSedimentDetection | null>({
      epithelial_cells: 0,
      mucus_threads: 0,
      casts: 0,
      squamous_epithelial: 0,
      abnormal_crystals: 0,
      confidence: 0,
      analysis_notes: "",
    });
  const [isAnalyzingLPF, setIsAnalyzingLPF] = useState<{
    [imageIndex: number]: boolean;
  }>({});

  // HPF Sediment Detection state - per image
  const [hpfSedimentDetection, setHpfSedimentDetection] =
    useState<HPFSedimentDetection | null>({
      rbc: 0,
      wbc: 0,
      epithelial_cells: 0,
      crystals: 0,
      bacteria: 0,
      yeast: 0,
      sperm: 0,
      parasites: 0,
      confidence: 0,
      analysis_notes: "",
    });
  const [isAnalyzingHPF, setIsAnalyzingHPF] = useState<{
    [imageIndex: number]: boolean;
  }>({});

  // State to prevent analysis during image deletion
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  // AbortController for canceling ongoing Gemini requests
  const [lpfAbortController, setLpfAbortController] =
    useState<AbortController | null>(null);
  const [hpfAbortController, setHpfAbortController] =
    useState<AbortController | null>(null);

  // Helper function to create dropdown options based on sediment type
  const getDropdownOptions = (type: string) => {
    const options = {
      epithelialCells: ["0", "0-5", "5-20", "20-100", ">100"],
      crystalsNormal: ["0", "0-2", "2-5", "5-20", ">20"],
      bacteria: ["0", "0-10", "10-50", "50-200", ">200"],
      mucusThreads: ["0", "0-1", "1-3", "3-10", ">10"],
      casts: ["0", "0-2", "2-5", "5-10", ">10"],
      rbcs: ["0", "0-2", "2-5", "5-10", "10-25", "25-50", "50-100", ">100"],
      wbcs: ["0", "0-2", "2-5", "5-10", "10-25", "25-50", "50-100", ">100"],
      squamousEpithelial: ["None", "Rare", "Few", "Moderate", "Many"],
      transitionalEpithelial: ["None", "Rare", "Few", "Moderate", "Many"],
      renalTubular: ["0", "0-1", "1-3", "3-5", ">5"],
      ovalFatBodies: ["0", "0-1", "1-3", "3-5", ">5"],
      abnormalCrystals: ["0", "0-1", "1-3", "3-5", ">5"],
    };
    return options[type as keyof typeof options] || ["0"];
  };


  // Debouncing refs to prevent rapid-fire API calls
  const lpfDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const hpfDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const DEBOUNCE_DELAY = 2000; // 2 seconds debounce (increased from 1s)
  
  // Analysis state tracking to prevent duplicate calls
  const analysisStateRef = useRef<{
    lpf: { [key: string]: boolean };
    hpf: { [key: string]: boolean };
  }>({ lpf: {}, hpf: {} });

  // Function to crop image based on bounding box
  const cropImageFromBoundingBox = useCallback(async (
    imageUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      
      // Try to set crossOrigin, but handle CORS errors gracefully
      try {
        img.crossOrigin = 'anonymous'
      } catch (e) {
        console.warn('Could not set crossOrigin, may have CORS issues:', e)
      }
      
      // Set timeout for image loading
      const timeout = setTimeout(() => {
        reject(new Error('Image load timeout'))
      }, 10000) // 10 second timeout
      
      img.onload = () => {
        clearTimeout(timeout)
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Calculate crop coordinates (ensure they're within image bounds)
          const cropX = Math.max(0, Math.min(x, img.width))
          const cropY = Math.max(0, Math.min(y, img.height))
          const cropWidth = Math.min(Math.max(1, width), img.width - cropX)
          const cropHeight = Math.min(Math.max(1, height), img.height - cropY)

          // Validate dimensions
          if (cropWidth <= 0 || cropHeight <= 0) {
            reject(new Error(`Invalid crop dimensions: ${cropWidth}x${cropHeight}`))
            return
          }

          // Set canvas size to crop dimensions
          canvas.width = cropWidth
          canvas.height = cropHeight

          // Draw the cropped portion
          ctx.drawImage(
            img,
            cropX, cropY, cropWidth, cropHeight, // Source
            0, 0, cropWidth, cropHeight // Destination
          )

          // Convert to base64
          const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9)
          if (!croppedDataUrl || croppedDataUrl.length < 100) {
            reject(new Error('Failed to generate cropped image data URL'))
            return
          }
          resolve(croppedDataUrl)
        } catch (error) {
          console.error('Error in cropImageFromBoundingBox:', error)
          reject(error)
        }
      }
      
      img.onerror = (e) => {
        clearTimeout(timeout)
        console.error('Image load error:', e, 'URL:', imageUrl)
        reject(new Error(`Failed to load image: ${imageUrl}`))
      }
      
      img.src = imageUrl
    })
  }, [])

  // Helper function to get cropped images by class name for LPF
  const getLPFCroppedImagesByClass = useCallback((className: string): Array<{ id: string; image: string; confidence: number }> => {
    // Debug logging
    console.log(`🔍 getLPFCroppedImagesByClass called for: ${className}`)
    console.log(`  - lpfYoloDetections:`, lpfYoloDetections ? `${lpfYoloDetections.predictions?.length || 0} predictions` : 'null')
    console.log(`  - lpfCroppedImages:`, lpfCroppedImages ? `${Object.keys(lpfCroppedImages).length} images` : 'null')
    
    if (!lpfYoloDetections || !lpfCroppedImages || Object.keys(lpfCroppedImages).length === 0) {
      console.log(`  ❌ Early return: missing detections or cropped images`)
      return []
    }
    
    // Map YOLO class names to table column names
    const classMap: Record<string, string[]> = {
      'epithelial_cells': ['epith', 'epithn'],
      'mucus_threads': ['mucus'],
      'casts': ['cast'],
      'squamous_epithelial': ['epith', 'epithn'],
      'abnormal_crystals': ['cryst'],
    }
    
    const yoloClasses = classMap[className] || []
    if (yoloClasses.length === 0) {
      console.warn(`⚠️ No YOLO class mapping found for LPF class: ${className}`)
      return []
    }
    
    console.log(`  - Looking for YOLO classes:`, yoloClasses)
    console.log(`  - Available YOLO predictions:`, lpfYoloDetections.predictions.map(p => p.class).join(', '))
    
    const matchingPredictions = lpfYoloDetections.predictions.filter(pred => {
      const predClassLower = pred.class.toLowerCase()
      const matches = yoloClasses.some(yc => {
        const ycLower = yc.toLowerCase()
        return predClassLower.includes(ycLower) || predClassLower === ycLower
      })
      if (matches) {
        console.log(`  ✅ Match found: ${pred.class} matches ${className}`)
      }
      return matches
    })
    
    console.log(`  - Matching predictions: ${matchingPredictions.length}`)
    
    const result = matchingPredictions
      .map(pred => {
        const croppedImage = lpfCroppedImages[pred.detection_id]
        console.log(`  - Checking detection ${pred.detection_id}:`, croppedImage ? `has image (${croppedImage.length} chars)` : 'NO IMAGE')
        return {
          id: pred.detection_id,
          image: croppedImage || '',
          confidence: pred.confidence
        }
      })
      .filter(item => {
        const hasImage = item.image && item.image.length > 0
        if (!hasImage) {
          console.log(`  ⚠️ Filtered out ${item.id}: no image data`)
        }
        return hasImage
      })
    
    console.log(`  ✅ Final result: ${result.length} cropped images for ${className}`)
    
    return result
  }, [lpfYoloDetections, lpfCroppedImages])

  // Helper function to get cropped images by class name for HPF
  const getHPFCroppedImagesByClass = useCallback((className: string): Array<{ id: string; image: string; confidence: number }> => {
    // Debug logging
    console.log(`🔍 getHPFCroppedImagesByClass called for: ${className}`)
    console.log(`  - hpfYoloDetections:`, hpfYoloDetections ? `${hpfYoloDetections.predictions?.length || 0} predictions` : 'null')
    console.log(`  - hpfCroppedImages:`, hpfCroppedImages ? `${Object.keys(hpfCroppedImages).length} images` : 'null')
    
    if (!hpfYoloDetections || !hpfCroppedImages || Object.keys(hpfCroppedImages).length === 0) {
      console.log(`  ❌ Early return: missing detections or cropped images`)
      return []
    }
    
    // Map YOLO class names to table column names
    const classMap: Record<string, string[]> = {
      'rbc': ['eryth'],
      'wbc': ['leuko'],
      'epithelial_cells': ['epith', 'epithn'],
      'crystals': ['cryst'],
      'bacteria': ['bacteria'],
      'yeast': ['mycete'],
      'sperm': ['sperm'],
      'parasites': ['parasite'],
    }
    
    const yoloClasses = classMap[className] || []
    if (yoloClasses.length === 0) {
      console.warn(`⚠️ No YOLO class mapping found for HPF class: ${className}`)
      return []
    }
    
    console.log(`  - Looking for YOLO classes:`, yoloClasses)
    console.log(`  - Available YOLO predictions:`, hpfYoloDetections.predictions.map(p => p.class).join(', '))
    
    const matchingPredictions = hpfYoloDetections.predictions.filter(pred => {
      const predClassLower = pred.class.toLowerCase()
      const matches = yoloClasses.some(yc => {
        const ycLower = yc.toLowerCase()
        return predClassLower.includes(ycLower) || predClassLower === ycLower
      })
      if (matches) {
        console.log(`  ✅ Match found: ${pred.class} matches ${className}`)
      }
      return matches
    })
    
    console.log(`  - Matching predictions: ${matchingPredictions.length}`)
    
    const result = matchingPredictions
      .map(pred => {
        const croppedImage = hpfCroppedImages[pred.detection_id]
        console.log(`  - Checking detection ${pred.detection_id}:`, croppedImage ? `has image (${croppedImage.length} chars)` : 'NO IMAGE')
        return {
          id: pred.detection_id,
          image: croppedImage || '',
          confidence: pred.confidence
        }
      })
      .filter(item => {
        const hasImage = item.image && item.image.length > 0
        if (!hasImage) {
          console.log(`  ⚠️ Filtered out ${item.id}: no image data`)
        }
        return hasImage
      })
    
    console.log(`  ✅ Final result: ${result.length} cropped images for ${className}`)
    
    return result
  }, [hpfYoloDetections, hpfCroppedImages])

  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 LPF State Update:', {
      hasYoloDetections: !!lpfYoloDetections,
      yoloDetectionsCount: lpfYoloDetections?.predictions?.length || 0,
      croppedImagesCount: Object.keys(lpfCroppedImages).length,
      croppedImageIds: Object.keys(lpfCroppedImages),
      yoloDetectionIds: lpfYoloDetections?.predictions?.map(p => p.detection_id) || []
    })
  }, [lpfYoloDetections, lpfCroppedImages])

  useEffect(() => {
    console.log('📊 HPF State Update:', {
      hasYoloDetections: !!hpfYoloDetections,
      yoloDetectionsCount: hpfYoloDetections?.predictions?.length || 0,
      croppedImagesCount: Object.keys(hpfCroppedImages).length,
      croppedImageIds: Object.keys(hpfCroppedImages),
      yoloDetectionIds: hpfYoloDetections?.predictions?.map(p => p.detection_id) || []
    })
  }, [hpfYoloDetections, hpfCroppedImages])

  // Function to analyze LPF image for sediments - ONLY for current image
  const analyzeLPFImage = useCallback(
    async (imageUrl: string, imageIndex: number) => {
      if (!imageUrl || !selectedTest) return;

      // Create unique key for this analysis
      const analysisKey = `${selectedTest.id}-LPF-${imageIndex}`;
      
      // Check if analysis is already in progress
      if (analysisStateRef.current.lpf[analysisKey]) {
        console.log(`⏳ LPF analysis already in progress for ${analysisKey} - skipping`);
        return;
      }

      // Mark analysis as in progress
      analysisStateRef.current.lpf[analysisKey] = true;

      console.log(
        `🔬 Starting LPF analysis for image ${
          imageIndex + 1
      } (URL: ${imageUrl.substring(0, 50)}...)`
    );

    // Cancel any existing LPF request
    if (lpfAbortController) {
      console.log("🛑 Canceling previous LPF request");
      lpfAbortController.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    setLpfAbortController(abortController);

    setIsAnalyzingLPF((prev) => ({ ...prev, [imageIndex]: true }));
    try {
      // Convert image URL to File object
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "lpf-image.jpg", { type: "image/jpeg" });

      console.log(`📤 Sending LPF image ${imageIndex + 1} to YOLO + Gemini pipeline...`);
      const form = new FormData();
      form.append("image", file);
      form.append("conf", confThreshold.toString());
      
      // Use YOLO + Gemini pipeline
      const res = await fetch("/api/analyze-image-yolo", {
        method: "POST",
        body: form,
        signal: abortController.signal,
        credentials: 'include',
      });
      if (!res.ok) throw new Error("YOLO + Gemini API failed");
      
      const result = (await res.json()) as {
        success: boolean;
        analysis: any; // Gemini analysis (we'll map this to LPFSedimentDetection)
        yolo_detections: {
          predictions: Array<{
            x: number
            y: number
            width: number
            height: number
            confidence: number
            class: string
            class_id: number
            detection_id: string
          }>
          summary: {
            total_detections: number
            by_class: Record<string, number>
          }
        };
      };
      
      console.log(`✅ YOLO + Gemini analysis complete for image ${imageIndex + 1}`);
      
      // Store YOLO detections
      setLpfYoloDetections(result.yolo_detections);
      
      // Map Gemini analysis to LPF format (we'll need to adapt this)
      // For now, create a basic detection from the analysis
      const detection: LPFSedimentDetection = {
        epithelial_cells: parseInt(result.analysis.epithelial_cells?.count || "0") || 0,
        mucus_threads: parseInt(result.analysis.mucus?.count || "0") || 0,
        casts: parseInt(result.analysis.casts?.count || "0") || 0,
        squamous_epithelial: 0, // May need to map from analysis
        abnormal_crystals: parseInt(result.analysis.crystals?.count || "0") || 0,
        confidence: result.analysis.overall_accuracy || 85,
        analysis_notes: result.analysis.summary || result.analysis.analysis_notes || "",
      };
      
      console.log("📝 New LPF Analysis text:", detection.analysis_notes);
      setLpfSedimentDetection(detection);
      
      // Crop images from YOLO detections
      if (result.yolo_detections.predictions.length > 0) {
        console.log(`🖼️ Starting to crop ${result.yolo_detections.predictions.length} images from LPF detections`)
        const croppedImages: Record<string, string> = {}
        for (const pred of result.yolo_detections.predictions) {
          try {
            console.log(`📸 Cropping image for ${pred.class} (${pred.detection_id}) at (${pred.x}, ${pred.y}, ${pred.width}, ${pred.height})`)
            const cropped = await cropImageFromBoundingBox(
              imageUrl,
              pred.x,
              pred.y,
              pred.width,
              pred.height
            )
            if (cropped && cropped.length > 0) {
              croppedImages[pred.detection_id] = cropped
              console.log(`✅ Successfully cropped image for ${pred.class} (${pred.detection_id})`)
            } else {
              console.warn(`⚠️ Empty cropped image for ${pred.class} (${pred.detection_id})`)
            }
          } catch (error) {
            console.error(`❌ Failed to crop image for detection ${pred.detection_id} (${pred.class}):`, error)
          }
        }
        setLpfCroppedImages(croppedImages)
        console.log(`✅ Cropped ${Object.keys(croppedImages).length}/${result.yolo_detections.predictions.length} images from LPF detections`)
        console.log(`📊 Cropped images by class:`, Object.entries(result.yolo_detections.summary.by_class || {}).map(([cls, count]) => `${cls}: ${count}`).join(', '))
      } else {
        console.warn('⚠️ No YOLO predictions to crop for LPF image')
      }

      // Save to individual image analysis table
      try {
        await upsertImageAnalysis({
          test_id: selectedTest.id,
          power_mode: "LPF",
          image_index: imageIndex,
          image_url: imageUrl,
          lpf_epithelial_cells: detection.epithelial_cells,
          lpf_mucus_threads: detection.mucus_threads,
          lpf_casts: detection.casts,
          lpf_squamous_epithelial: detection.squamous_epithelial,
          lpf_abnormal_crystals: detection.abnormal_crystals,
          confidence: detection.confidence,
          analysis_notes: detection.analysis_notes,
          yolo_detections: result.yolo_detections, // Save YOLO detections
          analyzed_at: new Date().toISOString(),
        });
        console.log("LPF AI analysis with YOLO detections saved to database");
        setNotificationMessage("LPF image analyzed and saved successfully");
        setNotificationType("success");
        setShowNotification(true);
      } catch (dbError) {
        console.warn("Database save failed, but analysis completed:", dbError);
        setNotificationMessage(
          "Analysis completed (database issue - check console for details)"
        );
        setNotificationType("warning");
        setShowNotification(true);
      }

      console.log("LPF Sediment Detection:", detection);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("🛑 LPF analysis cancelled for image", imageIndex + 1);
        return; // Don't show error for cancelled requests
      }
      console.error("Error analyzing LPF image:", error);
      setNotificationMessage("Failed to analyze LPF image");
      setNotificationType("error");
      setShowNotification(true);
    } finally {
      setIsAnalyzingLPF((prev) => ({ ...prev, [imageIndex]: false }));
      setLpfAbortController(null); // Clear the abort controller
      
      // Clear analysis state
      analysisStateRef.current.lpf[analysisKey] = false;
    }
    },
    [
      lpfAbortController,
      selectedTest,
      setIsAnalyzingLPF,
      setLpfAbortController,
      setLpfSedimentDetection,
      setNotificationMessage,
      setNotificationType,
      setShowNotification,
    ]
  );

  // Function to analyze HPF image for sediments - ONLY for current image
  const analyzeHPFImage = useCallback(
    async (imageUrl: string, imageIndex: number) => {
      if (!imageUrl || !selectedTest) return;

      // Create unique key for this analysis
      const analysisKey = `${selectedTest.id}-HPF-${imageIndex}`;
      
      // Check if analysis is already in progress
      if (analysisStateRef.current.hpf[analysisKey]) {
        console.log(`⏳ HPF analysis already in progress for ${analysisKey} - skipping`);
        return;
      }

      // Mark analysis as in progress
      analysisStateRef.current.hpf[analysisKey] = true;

    console.log(
      `🔬 Starting HPF analysis for image ${
        imageIndex + 1
      } (URL: ${imageUrl.substring(0, 50)}...)`
    );

    // Cancel any existing HPF request
    if (hpfAbortController) {
      console.log("🛑 Canceling previous HPF request");
      hpfAbortController.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    setHpfAbortController(abortController);

    setIsAnalyzingHPF((prev) => ({ ...prev, [imageIndex]: true }));
    try {
      // Convert image URL to File object
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "hpf-image.jpg", { type: "image/jpeg" });

      console.log(`📤 Sending HPF image ${imageIndex + 1} to YOLO + Gemini pipeline...`);
      const form = new FormData();
      form.append("image", file);
      form.append("conf", confThreshold.toString());
      
      // Use YOLO + Gemini pipeline
      const res = await fetch("/api/analyze-image-yolo", {
        method: "POST",
        body: form,
        signal: abortController.signal,
        credentials: 'include',
      });
      if (!res.ok) throw new Error("YOLO + Gemini API failed");
      
      const result = (await res.json()) as {
        success: boolean;
        analysis: any; // Gemini analysis
        yolo_detections: {
          predictions: Array<{
            x: number
            y: number
            width: number
            height: number
            confidence: number
            class: string
            class_id: number
            detection_id: string
          }>
          summary: {
            total_detections: number
            by_class: Record<string, number>
          }
        };
      };
      
      console.log(`✅ YOLO + Gemini analysis complete for image ${imageIndex + 1}`);
      
      // Store YOLO detections
      setHpfYoloDetections(result.yolo_detections);
      
      // Map Gemini analysis to HPF format
      const detection: HPFSedimentDetection = {
        rbc: parseInt(result.analysis.rbc?.count || "0") || 0,
        wbc: parseInt(result.analysis.wbc?.count || "0") || 0,
        epithelial_cells: parseInt(result.analysis.epithelial_cells?.count || "0") || 0,
        crystals: parseInt(result.analysis.crystals?.count || "0") || 0,
        bacteria: parseInt(result.analysis.bacteria?.count || "0") || 0,
        yeast: parseInt(result.analysis.yeast?.count || "0") || 0,
        sperm: parseInt(result.analysis.sperm?.count || "0") || 0,
        parasites: parseInt(result.analysis.parasites?.count || "0") || 0,
        confidence: result.analysis.overall_accuracy || 85,
        analysis_notes: result.analysis.summary || result.analysis.analysis_notes || "",
      };
      
      console.log("📝 New HPF Analysis text:", detection.analysis_notes);
      setHpfSedimentDetection(detection);
      
      // Crop images from YOLO detections
      if (result.yolo_detections.predictions.length > 0) {
        console.log(`🖼️ Starting to crop ${result.yolo_detections.predictions.length} images from HPF detections`)
        const croppedImages: Record<string, string> = {}
        for (const pred of result.yolo_detections.predictions) {
          try {
            console.log(`📸 Cropping image for ${pred.class} (${pred.detection_id}) at (${pred.x}, ${pred.y}, ${pred.width}, ${pred.height})`)
            const cropped = await cropImageFromBoundingBox(
              imageUrl,
              pred.x,
              pred.y,
              pred.width,
              pred.height
            )
            if (cropped && cropped.length > 0) {
              croppedImages[pred.detection_id] = cropped
              console.log(`✅ Successfully cropped image for ${pred.class} (${pred.detection_id})`)
            } else {
              console.warn(`⚠️ Empty cropped image for ${pred.class} (${pred.detection_id})`)
            }
          } catch (error) {
            console.error(`❌ Failed to crop image for detection ${pred.detection_id} (${pred.class}):`, error)
          }
        }
        setHpfCroppedImages(croppedImages)
        console.log(`✅ Cropped ${Object.keys(croppedImages).length}/${result.yolo_detections.predictions.length} images from HPF detections`)
        console.log(`📊 Cropped images by class:`, Object.entries(result.yolo_detections.summary.by_class || {}).map(([cls, count]) => `${cls}: ${count}`).join(', '))
      } else {
        console.warn('⚠️ No YOLO predictions to crop for HPF image')
      }

      // Save to individual image analysis table
      try {
        await upsertImageAnalysis({
          test_id: selectedTest.id,
          power_mode: "HPF",
          image_index: imageIndex,
          image_url: imageUrl,
          hpf_rbc: detection.rbc,
          hpf_wbc: detection.wbc,
          hpf_epithelial_cells: detection.epithelial_cells,
          hpf_crystals: detection.crystals,
          hpf_bacteria: detection.bacteria,
          hpf_yeast: detection.yeast,
          hpf_sperm: detection.sperm,
          hpf_parasites: detection.parasites,
          confidence: detection.confidence,
          analysis_notes: detection.analysis_notes,
          yolo_detections: result.yolo_detections, // Save YOLO detections
          analyzed_at: new Date().toISOString(),
        });
        console.log("HPF AI analysis with YOLO detections saved to database");
        setNotificationMessage("HPF image analyzed and saved successfully");
        setNotificationType("success");
        setShowNotification(true);
      } catch (dbError) {
        console.warn("Database save failed, but analysis completed:", dbError);
        setNotificationMessage(
          "Analysis completed (database issue - check console for details)"
        );
        setNotificationType("warning");
        setShowNotification(true);
      }

      console.log("HPF Sediment Detection:", detection);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("🛑 HPF analysis cancelled for image", imageIndex + 1);
        return; // Don't show error for cancelled requests
      }
      console.error("Error analyzing HPF image:", error);
      setNotificationMessage("Failed to analyze HPF image");
      setNotificationType("error");
      setShowNotification(true);
    } finally {
      setIsAnalyzingHPF((prev) => ({ ...prev, [imageIndex]: false }));
      setHpfAbortController(null); // Clear the abort controller
      
      // Clear analysis state
      analysisStateRef.current.hpf[analysisKey] = false;
    }
  }, [
    hpfAbortController,
    selectedTest,
    setHpfSedimentDetection,
    setIsAnalyzingHPF,
    setNotificationMessage,
    setNotificationType,
    setShowNotification,
  ]);

  // Cleanup function to clear debounce timeouts
  useEffect(() => {
    return () => {
      if (lpfDebounceRef.current) {
        clearTimeout(lpfDebounceRef.current);
      }
      if (hpfDebounceRef.current) {
        clearTimeout(hpfDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (dateParam) {
      console.log("Report page: Loading data for date:", dateParam);
      setSelectedDate(dateParam);
      preloadByDate(dateParam);
    } else {
      // Set default to current date if no date param
      const today = new Date().toISOString().split("T")[0];
      setSelectedDate(today);
      preloadByDate(today);
    }
  }, [dateParam, preloadByDate]);

  // Initialize date parameter from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setDateParam(sp.get("date"));
    }
  }, []);

  // Update URL when test is selected
  useEffect(() => {
    if (selectedTest && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("test", selectedTest.id);
      // Keep the date parameter if it exists
      if (dateParam) {
        url.searchParams.set("date", dateParam);
      }
      // Update URL without page reload
      window.history.replaceState({}, "", url.toString());
    }
  }, [selectedTest, dateParam]);

  // Select test from URL parameter when tests are loaded
  useEffect(() => {
    if (tests.length > 0 && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const testIdFromUrl = urlParams.get("test");

      if (testIdFromUrl) {
        // Find the test with the ID from URL
        const testFromUrl = tests.find((test) => test.id === testIdFromUrl);
        if (testFromUrl && testFromUrl.id !== selectedTest?.id) {
          console.log("Selecting test from URL:", testFromUrl.test_code);
          setSelectedTest(testFromUrl);

          // Also set the patient for this test
          const testPatient = patients.find(
            (p) => p.id === testFromUrl.patient_id
          );
          if (testPatient) {
            setSelectedPatient(testPatient);
          }
        }
      }
    }
  }, [tests, patients, selectedTest, setSelectedTest, setSelectedPatient]);

  // Search and filter tests by date and search query
  const filteredTests = useMemo(() => {
    let filtered = tests;

    // Filter by date first
    if (selectedDate) {
      filtered = filtered.filter((test) => {
        const testDate =
          test.analysis_date?.split("T")[0] || test.created_at?.split("T")[0];
        return testDate === selectedDate;
      });
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((test) => {
        const patient = patients.find((p) => p.id === test.patient_id);
        return (
          patient?.name.toLowerCase().includes(query) ||
          patient?.patient_id.toLowerCase().includes(query) ||
          test.test_code.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [tests, patients, searchQuery, selectedDate]);

  // Initialize edit data when patient/test changes
  useEffect(() => {
    if (selectedPatient && selectedTest) {
      setEditData({
        patientName: selectedPatient.name,
        patientAge: selectedPatient.age.toString(),
        patientGender: selectedPatient.gender,
        collectionTime: selectedTest.collection_time || "",
        technician: selectedTest.technician || "",
      });
    }
  }, [selectedPatient, selectedTest]);

  // Auto-start camera on component mount
  // Start live camera
  const startLiveCamera = useCallback(async () => {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setNotificationMessage("Camera not supported in this environment.");
        setNotificationType("error");
        setShowNotification(true);
        return;
      }
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to any camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      setMediaStream(stream);
      if (videoRef.current) {
        const elem = videoRef.current;
        attachStreamToVideo(elem, stream);
        elem.onloadedmetadata = async () => {
          try {
            await elem.play();
          } catch {}
        };
      }
      setLiveStreamActive(true);
    } catch (err) {
      console.error("Failed to start camera:", err);
      setNotificationMessage(
        "Failed to start camera. Please check permissions."
      );
      setNotificationType("error");
      setShowNotification(true);
    }
  }, [attachStreamToVideo]);

  useEffect(() => {
    startLiveCamera();
    return () => {
      // Cleanup on unmount
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, [startLiveCamera]);

  // Capture image from camera
  const captureImage = async () => {
    if (!videoRef.current || !mediaStream || !selectedTest) {
      setNotificationMessage("Please select a test first");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    // Check image limit based on current power mode
    const currentImageCount =
      powerMode === "high" ? highPowerImages.length : lowPowerImages.length;
    if (currentImageCount >= 10) {
      setNotificationMessage(
        `Maximum of 10 ${
          powerMode === "high" ? "HPF" : "LPF"
        } images reached. Please delete some images before adding more.`
      );
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      });

      // Create a File object from the blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const powerType = powerMode === "high" ? "hpf" : "lpf";
      const filename = `${powerType}-${selectedTest.test_code}-${timestamp}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      // Upload to Supabase storage
      const imageUrl = await uploadImageToStorage(
        file,
        selectedTest.id,
        "microscopic"
      );

      if (imageUrl) {
        console.log(`📸 Capturing new ${powerType.toUpperCase()} image...`);

        // Add image to test record with correct power type
        await addImageToTest(selectedTest.id, imageUrl, powerType);

        // Clear existing analysis data for new image
        if (powerMode === "high") {
          setHpfSedimentDetection(null);
          setIsAnalyzingHPF({});
        } else {
          setLpfSedimentDetection(null);
          setIsAnalyzingLPF({});
        }

        // Update local state based on power mode
        const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (powerMode === "high") {
          setHighPowerImages((prev) => {
            const newImages = [...prev, imageDataUrl];
            setCurrentHPFIndex(newImages.length - 1);
            console.log(
              `📸 HPF image captured, new index: ${newImages.length - 1}`
            );
            return newImages;
          });
        } else {
          setLowPowerImages((prev) => {
            const newImages = [...prev, imageDataUrl];
            setCurrentLPFIndex(newImages.length - 1);
            console.log(
              `📸 LPF image captured, new index: ${newImages.length - 1}`
            );
            return newImages;
          });
        }

        // Check if we've reached 10 LPF images and auto-switch to HPF
        if (powerMode === "low" && lowPowerImages.length + 1 >= 10) {
          setPowerMode("high");
          setNotificationMessage(
            `Captured LPF image ${
              lowPowerImages.length + 1
            }/10. Automatically switched to HPF mode for detailed analysis.`
          );
          setNotificationType("success");
        } else {
          setNotificationMessage(
            `Image captured and saved successfully! (${
              currentImageCount + 1
            }/10 ${powerMode === "high" ? "HPF" : "LPF"})`
          );
          setNotificationType("success");
        }
        setShowNotification(true);

        // Refresh test data
        if (dateParam) {
          await preloadByDate(dateParam);
        }
      } else {
        throw new Error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      setNotificationMessage("Failed to capture and save image");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  // Remove captured image
  const removeCapturedImage = async (
    index: number,
    powerType: "high" | "low"
  ) => {
    if (!selectedTest) return;

    console.log(
      `🗑️ Deleting ${powerType.toUpperCase()} image at index ${index}`
    );

    // Cancel any ongoing analysis requests
    if (powerType === "low" && lpfAbortController) {
      console.log("🛑 Canceling ongoing LPF analysis request");
      lpfAbortController.abort();
      setLpfAbortController(null);
    } else if (powerType === "high" && hpfAbortController) {
      console.log("🛑 Canceling ongoing HPF analysis request");
      hpfAbortController.abort();
      setHpfAbortController(null);
    }

    setIsDeletingImage(true);
    try {
      // Get the correct image array based on power type
      const imageArray =
        powerType === "high" ? highPowerImages : lowPowerImages;
      const imageUrl = imageArray[index];

      if (imageUrl) {
        // Remove from Supabase storage
        await deleteImageFromStorage(imageUrl);

        // Remove from test record with correct power type
        const dbPowerType = powerType === "high" ? "hpf" : "lpf";
        await deleteImageFromTest(selectedTest.id, imageUrl, dbPowerType);

        // Update local state based on power type
        if (powerType === "high") {
          const newImages = highPowerImages.filter((_, i) => i !== index);
          setHighPowerImages(newImages);

          // Adjust current index if needed
          if (currentHPFIndex >= newImages.length && newImages.length > 0) {
            setCurrentHPFIndex(newImages.length - 1);
          } else if (newImages.length === 0) {
            setCurrentHPFIndex(0);
          }
        } else {
          const newImages = lowPowerImages.filter((_, i) => i !== index);
          setLowPowerImages(newImages);

          // Adjust current index if needed
          if (currentLPFIndex >= newImages.length && newImages.length > 0) {
            setCurrentLPFIndex(newImages.length - 1);
          } else if (newImages.length === 0) {
            setCurrentLPFIndex(0);
          }
        }

        // Delete individual image analysis for this specific image
        try {
          await deleteImageAnalysisByImage(
            selectedTest.id,
            powerType === "high" ? "HPF" : "LPF",
            index
          );
        } catch (error) {
          console.warn("Error deleting individual image analysis:", error);
        }

        // Clear AI analysis data if this was the last image
        const remainingImages =
          powerType === "high"
            ? highPowerImages.filter((_, i) => i !== index)
            : lowPowerImages.filter((_, i) => i !== index);
        if (remainingImages.length === 0) {
          // Clear local state when no images remain
          if (powerType === "low") {
            setLpfSedimentDetection(null);
          } else {
            setHpfSedimentDetection(null);
          }
        }
        // Note: useEffect hooks will automatically handle analysis for remaining images

        // Refresh test data
        if (dateParam) {
          await preloadByDate(dateParam);
        }

        setNotificationMessage("Image deleted successfully!");
        setNotificationType("success");
        setShowNotification(true);
      }
    } catch (error) {
      console.error("Error removing image:", error);
      setNotificationMessage("Failed to delete image");
      setNotificationType("error");
      setShowNotification(true);
    } finally {
      setIsDeletingImage(false);
    }
  };

  // Function to handle LPF image upload
  const handleLPFImageUpload = async (file: File) => {
    if (!selectedTest) return;

    try {
      console.log("📤 Uploading new LPF image...");

      // Upload image to Supabase storage
      const imagePath = await uploadImageToStorage(
        file,
        selectedTest.id,
        "lpf"
      );

      // Add image to test record
      await addImageToTest(
        selectedTest.id,
        imagePath,
        "lpf"
      );

      // Clear existing analysis data for new image
      setLpfSedimentDetection(null);
      setLpfYoloDetections(null);
      setLpfCroppedImages({});
      setIsAnalyzingLPF({});

      // Update local state
      setLowPowerImages((prev) => {
        const newImages = [...prev, imagePath];
        // Set current index to the new image (last in array)
        setCurrentLPFIndex(newImages.length - 1);
        console.log(`📸 LPF image added, new index: ${newImages.length - 1}`);
        return newImages;
      });

      setNotificationMessage("LPF image uploaded successfully!");
      setNotificationType("success");
      setShowNotification(true);

      // Refresh test data
      if (dateParam) {
        await preloadByDate(dateParam);
      }
    } catch (error) {
      console.error("Error uploading LPF image:", error);
      setNotificationMessage("Failed to upload LPF image");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  // Function to handle HPF image upload
  const handleHPFImageUpload = async (file: File) => {
    if (!selectedTest) return;

    try {
      console.log("📤 Uploading new HPF image...");

      // Upload image to Supabase storage
      const imagePath = await uploadImageToStorage(
        file,
        selectedTest.id,
        "hpf"
      );

      // Add image to test record
      await addImageToTest(
        selectedTest.id,
        imagePath,
        "hpf"
      );

      // Clear existing analysis data for new image
      setHpfSedimentDetection(null);
      setHpfYoloDetections(null);
      setHpfCroppedImages({});
      setIsAnalyzingHPF({});

      // Update local state
      setHighPowerImages((prev) => {
        const newImages = [...prev, imagePath];
        // Set current index to the new image (last in array)
        setCurrentHPFIndex(newImages.length - 1);
        console.log(`📸 HPF image added, new index: ${newImages.length - 1}`);
        return newImages;
      });

      setNotificationMessage("HPF image uploaded successfully!");
      setNotificationType("success");
      setShowNotification(true);

      // Refresh test data
      if (dateParam) {
        await preloadByDate(dateParam);
      }
    } catch (error) {
      console.error("Error uploading HPF image:", error);
      setNotificationMessage("Failed to upload HPF image");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  // Function to recount AI analysis for current specific image
  const recountImage = async (powerMode: "low" | "high") => {
    if (!selectedTest) return;

    try {
      // Clear existing AI analysis data for the current specific image only
      if (powerMode === "low" && lowPowerImages.length > 0) {
        await deleteImageAnalysisByImage(
          selectedTest.id,
          "LPF",
          currentLPFIndex
        );
        setLpfSedimentDetection(null);
        setLpfYoloDetections(null);
        setLpfCroppedImages({});
        // Re-analyze the current LPF image
        analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex);
      } else if (powerMode === "high" && highPowerImages.length > 0) {
        await deleteImageAnalysisByImage(
          selectedTest.id,
          "HPF",
          currentHPFIndex
        );
        setHpfSedimentDetection(null);
        setHpfYoloDetections(null);
        setHpfCroppedImages({});
        // Re-analyze the current HPF image
        analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex);
      }

      setNotificationMessage(
        `${powerMode.toUpperCase()} image recounted successfully`
      );
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error recounting image:", error);
      setNotificationMessage("Failed to recount image");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  // Function to save individual LPF count to database
  const saveLPFCountToDatabase = async (
    field: keyof LPFSedimentDetection,
    value: number
  ) => {
    if (!selectedTest || !lpfSedimentDetection) return;

    try {
      const imageIndex = currentLPFIndex;
      const imageUrl = lowPowerImages[currentLPFIndex];

      // Update LPF detection with new value
      const updatedDetection = {
        ...lpfSedimentDetection,
        [field]: value,
      } as LPFSedimentDetection;

      // Save to database
      await upsertImageAnalysis({
        test_id: selectedTest.id,
        power_mode: "LPF",
        image_index: imageIndex,
        image_url: imageUrl,
        lpf_epithelial_cells: updatedDetection.epithelial_cells,
        lpf_mucus_threads: updatedDetection.mucus_threads,
        lpf_casts: updatedDetection.casts,
        lpf_squamous_epithelial: updatedDetection.squamous_epithelial,
        lpf_abnormal_crystals: updatedDetection.abnormal_crystals,
        confidence: updatedDetection.confidence,
        analysis_notes:
          (updatedDetection.analysis_notes || "") + " (Manually corrected)",
        analyzed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving LPF count to database:", error);
    }
  };

  // Function to save individual HPF count to database
  const saveHPFCountToDatabase = async (
    field: keyof HPFSedimentDetection,
    value: number
  ) => {
    if (!selectedTest || !hpfSedimentDetection) return;

    try {
      const imageIndex = currentHPFIndex;
      const imageUrl = highPowerImages[currentHPFIndex];

      // Update HPF detection with new value
      const updatedDetection = {
        ...hpfSedimentDetection,
        [field]: value,
      } as HPFSedimentDetection;

      // Save to database
      await upsertImageAnalysis({
        test_id: selectedTest.id,
        power_mode: "HPF",
        image_index: imageIndex,
        image_url: imageUrl,
        hpf_rbc: updatedDetection.rbc,
        hpf_wbc: updatedDetection.wbc,
        hpf_epithelial_cells: updatedDetection.epithelial_cells,
        hpf_crystals: updatedDetection.crystals,
        hpf_bacteria: updatedDetection.bacteria,
        hpf_yeast: updatedDetection.yeast,
        hpf_sperm: updatedDetection.sperm,
        hpf_parasites: updatedDetection.parasites,
        confidence: updatedDetection.confidence,
        analysis_notes:
          (updatedDetection.analysis_notes || "") + " (Manually corrected)",
        analyzed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving HPF count to database:", error);
    }
  };

  // Ensure video element attaches to stream even if created later
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
    if (!mediaStream || !videoRef.current) return;
    const elem = videoRef.current;
    try {
      attachStreamToVideo(elem, mediaStream);
      const play = async () => {
        try {
          await elem.play();
        } catch {}
      };
      if (elem.readyState >= 2) {
        void play();
      } else {
        elem.onloadedmetadata = play;
      }
    } catch {}
  }, [mediaStream, attachStreamToVideo]);

  // Sync captured images with test's HPF and LPF images
  useEffect(() => {
    if (selectedTest) {
      // Sync HPF images from database
      setHighPowerImages(selectedTest.hpf_images || []);
      // Sync LPF images from database
      setLowPowerImages(selectedTest.lpf_images || []);
    } else if (!selectedTest) {
      setHighPowerImages([]);
      setLowPowerImages([]);
    }
    // Reset current indices when test changes
    setCurrentHPFIndex(0);
    setCurrentLPFIndex(0);
  }, [selectedTest]);

  // Ensure indices are valid when image arrays change
  useEffect(() => {
    if (lowPowerImages.length > 0 && currentLPFIndex >= lowPowerImages.length) {
      setCurrentLPFIndex(lowPowerImages.length - 1);
    } else if (lowPowerImages.length === 0) {
      setCurrentLPFIndex(0);
    }
  }, [lowPowerImages.length, currentLPFIndex]);

  useEffect(() => {
    if (
      highPowerImages.length > 0 &&
      currentHPFIndex >= highPowerImages.length
    ) {
      setCurrentHPFIndex(highPowerImages.length - 1);
    } else if (highPowerImages.length === 0) {
      setCurrentHPFIndex(0);
    }
  }, [highPowerImages.length, currentHPFIndex]);


  // Auto-analyze LPF images when they change - ONLY for currently displayed image
  useEffect(() => {
    if (
      lowPowerImages.length > 0 &&
      currentLPFIndex < lowPowerImages.length &&
      selectedTest &&
      !isDeletingImage
    ) {
      console.log(
        `🔄 LPF Image changed - checking image ${currentLPFIndex + 1}/${
          lowPowerImages.length
        }`
      );

      // Clear previous analysis data immediately when switching images
      setLpfSedimentDetection(null);
      setLpfYoloDetections(null);
      setLpfCroppedImages({});

      // Clear loading state for previous image
      setIsAnalyzingLPF((prev) => ({ ...prev, [currentLPFIndex]: false }));

      // Clear any existing debounce timeout
      if (lpfDebounceRef.current) {
        clearTimeout(lpfDebounceRef.current);
      }

      // Debounce the analysis to prevent rapid-fire API calls
      lpfDebounceRef.current = setTimeout(() => {
        // Check for existing analysis for this specific image
        const checkExistingAnalysis = async () => {
        try {
          console.log(
            `📊 Checking database for existing LPF analysis: test=${selectedTest.id}, index=${currentLPFIndex}`
          );
          
          // Add timeout to database query to prevent hanging
          const existingAnalysis = await Promise.race([
            getImageAnalysisByIndex(selectedTest.id, "LPF", currentLPFIndex),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]) as any;

          if (existingAnalysis) {
            console.log(
              "✅ Found existing LPF analysis in database - loading from cache"
            );
            console.log(
              "📝 LPF Analysis text:",
              existingAnalysis.analysis_notes
            );
            setLpfSedimentDetection({
              epithelial_cells:
                typeof existingAnalysis.lpf_epithelial_cells === "number"
                  ? existingAnalysis.lpf_epithelial_cells
                  : 0,
              mucus_threads:
                typeof existingAnalysis.lpf_mucus_threads === "number"
                  ? existingAnalysis.lpf_mucus_threads
                  : 0,
              casts:
                typeof existingAnalysis.lpf_casts === "number"
                  ? existingAnalysis.lpf_casts
                  : 0,
              squamous_epithelial:
                typeof existingAnalysis.lpf_squamous_epithelial === "number"
                  ? existingAnalysis.lpf_squamous_epithelial
                  : 0,
              abnormal_crystals:
                typeof existingAnalysis.lpf_abnormal_crystals === "number"
                  ? existingAnalysis.lpf_abnormal_crystals
                  : 0,
              confidence: existingAnalysis.confidence || 0,
              analysis_notes: existingAnalysis.analysis_notes || "",
            });
            
            // Restore YOLO detections and regenerate cropped images
            if (existingAnalysis.yolo_detections) {
              console.log("🔄 Restoring YOLO detections from database");
              setLpfYoloDetections(existingAnalysis.yolo_detections);
              
              // Regenerate cropped images from stored bounding boxes
              const imageUrl = lowPowerImages[currentLPFIndex];
              if (imageUrl && existingAnalysis.yolo_detections.predictions?.length > 0) {
                const croppedImages: Record<string, string> = {}
                for (const pred of existingAnalysis.yolo_detections.predictions) {
                  try {
                    const cropped = await cropImageFromBoundingBox(
                      imageUrl,
                      pred.x,
                      pred.y,
                      pred.width,
                      pred.height
                    )
                    croppedImages[pred.detection_id] = cropped
                  } catch (error) {
                    console.error(`Failed to regenerate cropped image for detection ${pred.detection_id}:`, error)
                  }
                }
                setLpfCroppedImages(croppedImages)
                console.log(`✅ Regenerated ${Object.keys(croppedImages).length} cropped images from stored YOLO detections`)
              }
            }
          } else {
            console.log(
              "❌ No existing LPF analysis found - calling Gemini API for current image only"
            );
            // Only call API if no database data exists for this specific image
            analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex);
          }
        } catch (error) {
          console.error("Error checking existing LPF analysis:", error);
          
          // Check if it's a specific database error
          if (error instanceof Error) {
            if (error.message.includes('timeout')) {
              console.log("⏰ Database query timed out - calling Gemini API as fallback");
            } else if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
              console.log("🚫 Database query rejected (406) - calling Gemini API as fallback");
            } else {
              console.log("⚠️ Database check failed - calling Gemini API as fallback");
            }
          } else {
            console.log("⚠️ Unknown database error - calling Gemini API as fallback");
          }
          
          // Fallback to API call if database check fails
          analyzeLPFImage(lowPowerImages[currentLPFIndex], currentLPFIndex);
        }
      };

        checkExistingAnalysis();
      }, DEBOUNCE_DELAY);
    } else {
      console.log(
        "🔄 LPF images cleared or no current image - clearing detection state"
      );
      setLpfSedimentDetection(null);
      setLpfYoloDetections(null);
      setLpfCroppedImages({});
      setIsAnalyzingLPF({});
    }
  }, [
    lowPowerImages,
    currentLPFIndex,
    selectedTest,
    isDeletingImage,
    analyzeLPFImage,
  ]);

  // Auto-analyze HPF images when they change - ONLY for currently displayed image
  useEffect(() => {
    if (
      highPowerImages.length > 0 &&
      currentHPFIndex < highPowerImages.length &&
      selectedTest &&
      !isDeletingImage
    ) {
      console.log(
        `🔄 HPF Image changed - checking image ${currentHPFIndex + 1}/${
          highPowerImages.length
        }`
      );

      // Clear previous analysis data immediately when switching images
      setHpfSedimentDetection(null);
      setHpfYoloDetections(null);
      setHpfCroppedImages({});

      // Clear loading state for previous image
      setIsAnalyzingHPF((prev) => ({ ...prev, [currentHPFIndex]: false }));

      // Clear any existing debounce timeout
      if (hpfDebounceRef.current) {
        clearTimeout(hpfDebounceRef.current);
      }

      // Debounce the analysis to prevent rapid-fire API calls
      hpfDebounceRef.current = setTimeout(() => {
        // Check for existing analysis for this specific image
        const checkExistingAnalysis = async () => {
        try {
          console.log(
            `📊 Checking database for existing HPF analysis: test=${selectedTest.id}, index=${currentHPFIndex}`
          );
          
          // Add timeout to database query to prevent hanging
          const existingAnalysis = await Promise.race([
            getImageAnalysisByIndex(selectedTest.id, "HPF", currentHPFIndex),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Database query timeout')), 5000)
            )
          ]) as any;

          if (existingAnalysis) {
            console.log(
              "✅ Found existing HPF analysis in database - loading from cache"
            );
            console.log(
              "📝 HPF Analysis text:",
              existingAnalysis.analysis_notes
            );
            setHpfSedimentDetection({
              rbc:
                typeof existingAnalysis.hpf_rbc === "number"
                  ? existingAnalysis.hpf_rbc
                  : 0,
              wbc:
                typeof existingAnalysis.hpf_wbc === "number"
                  ? existingAnalysis.hpf_wbc
                  : 0,
              epithelial_cells:
                typeof existingAnalysis.hpf_epithelial_cells === "number"
                  ? existingAnalysis.hpf_epithelial_cells
                  : 0,
              crystals:
                typeof existingAnalysis.hpf_crystals === "number"
                  ? existingAnalysis.hpf_crystals
                  : 0,
              bacteria:
                typeof existingAnalysis.hpf_bacteria === "number"
                  ? existingAnalysis.hpf_bacteria
                  : 0,
              yeast:
                typeof existingAnalysis.hpf_yeast === "number"
                  ? existingAnalysis.hpf_yeast
                  : 0,
              sperm:
                typeof existingAnalysis.hpf_sperm === "number"
                  ? existingAnalysis.hpf_sperm
                  : 0,
              parasites:
                typeof existingAnalysis.hpf_parasites === "number"
                  ? existingAnalysis.hpf_parasites
                  : 0,
              confidence: existingAnalysis.confidence || 0,
              analysis_notes: existingAnalysis.analysis_notes || "",
            });
            
            // Restore YOLO detections and regenerate cropped images
            if (existingAnalysis.yolo_detections) {
              console.log("🔄 Restoring YOLO detections from database");
              setHpfYoloDetections(existingAnalysis.yolo_detections);
              
              // Regenerate cropped images from stored bounding boxes
              const imageUrl = highPowerImages[currentHPFIndex];
              if (imageUrl && existingAnalysis.yolo_detections.predictions?.length > 0) {
                const croppedImages: Record<string, string> = {}
                for (const pred of existingAnalysis.yolo_detections.predictions) {
                  try {
                    const cropped = await cropImageFromBoundingBox(
                      imageUrl,
                      pred.x,
                      pred.y,
                      pred.width,
                      pred.height
                    )
                    croppedImages[pred.detection_id] = cropped
                  } catch (error) {
                    console.error(`Failed to regenerate cropped image for detection ${pred.detection_id}:`, error)
                  }
                }
                setHpfCroppedImages(croppedImages)
                console.log(`✅ Regenerated ${Object.keys(croppedImages).length} cropped images from stored YOLO detections`)
              }
            }
          } else {
            console.log(
              "❌ No existing HPF analysis found - calling Gemini API for current image only"
            );
            // Only call API if no database data exists for this specific image
            analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex);
          }
        } catch (error) {
          console.error("Error checking existing HPF analysis:", error);
          
          // Check if it's a specific database error
          if (error instanceof Error) {
            if (error.message.includes('timeout')) {
              console.log("⏰ Database query timed out - calling Gemini API as fallback");
            } else if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
              console.log("🚫 Database query rejected (406) - calling Gemini API as fallback");
            } else {
              console.log("⚠️ Database check failed - calling Gemini API as fallback");
            }
          } else {
            console.log("⚠️ Unknown database error - calling Gemini API as fallback");
          }
          
          // Fallback to API call if database check fails
          analyzeHPFImage(highPowerImages[currentHPFIndex], currentHPFIndex);
        }
      };

      checkExistingAnalysis();
      }, DEBOUNCE_DELAY);
    } else {
      console.log(
        "🔄 HPF images cleared or no current image - clearing detection state"
      );
      setHpfSedimentDetection(null);
      setHpfYoloDetections(null);
      setHpfCroppedImages({});
      setIsAnalyzingHPF({});
    }
  }, [
    highPowerImages,
    currentHPFIndex,
    selectedTest,
    isDeletingImage,
    analyzeHPFImage,
  ]);

  // Ensure camera stream is attached to video element when test changes
  useEffect(() => {
    if (mediaStream && videoRef.current && liveStreamActive) {
      const videoElement = videoRef.current;
      const currentStream = 'srcObject' in videoElement
        ? (videoElement as HTMLVideoElement & { srcObject: MediaStream | null }).srcObject
        : null;
      if (currentStream !== mediaStream) {
        attachStreamToVideo(videoElement, mediaStream);
        videoElement.onloadedmetadata = async () => {
          try {
            await videoElement.play();
          } catch (err) {
            console.error("Failed to play video:", err);
          }
        };
      }
    }
  }, [selectedTest, mediaStream, liveStreamActive, attachStreamToVideo]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original data
      if (selectedPatient && selectedTest) {
        setEditData({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age.toString(),
          patientGender: selectedPatient.gender,
          collectionTime: selectedTest.collection_time || "",
          technician: selectedTest.technician || "",
        });
      }
    } else {
      // Start editing - populate with current data
      if (selectedPatient && selectedTest) {
        setEditData({
          patientName: selectedPatient.name,
          patientAge: selectedPatient.age.toString(),
          patientGender: selectedPatient.gender,
          collectionTime: selectedTest.collection_time || "",
          technician: selectedTest.technician || "",
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!selectedPatient) return;

    setSaving(true);
    try {
      // Update patient data
      await updatePatient(selectedPatient.id, {
        name: editData.patientName,
        age: parseInt(editData.patientAge),
        gender: editData.patientGender,
      });

      // Update test data if available
      if (selectedTest) {
        await updateTest(selectedTest.id, {
          collection_time: editData.collectionTime,
          technician: editData.technician,
        });
      }

      // Refresh data
      await preloadByDate(dateParam || new Date().toISOString().split("T")[0]);
      setIsEditing(false);
      setNotificationMessage("Changes saved successfully!");
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Failed to save changes:", error);
      setNotificationMessage("Failed to save changes. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    } finally {
      setSaving(false);
    }
  };

  const handleNewPatient = async () => {
    try {
      // Create minimal patient data with valid values
      const patientData: AddPatientWithTestInput = {
        name: "Unknown Patient",
        age: "0",
        gender: "other",
        patient_id: `PAT-${Date.now()}`,
      };

      // Create patient with test for the current date
      const result = await addPatientWithTest(
        patientData,
        dateParam || new Date().toISOString().split("T")[0]
      );

      if (result.test && result.patient) {
        setNotificationMessage(
          `Success! New test "${result.test.test_code}" created successfully.`
        );
        setNotificationType("success");
        setShowNotification(true);

        // Refresh data to show the new test
        if (dateParam) {
          await preloadByDate(dateParam);
        }
      }
    } catch (error) {
      console.error("Error creating new test:", error);
      setNotificationMessage("Failed to create new test");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  // const handleImageAnalysis = () => {
  //   setShowImageAnalysisModal(true)
  // }

  const handleDeleteTest = async () => {
    if (!selectedTest) return;

    try {
      await deleteTest(selectedTest.id);
      console.log("Test deleted successfully");

      // Refresh the data - always refresh regardless of dateParam
      if (dateParam) {
        await preloadByDate(dateParam);
      } else if (selectedPatient) {
        // If viewing by patient, refresh the patient's tests
        await loadTestsForPatient(selectedPatient.id);
      } else {
        // Fallback: reload all patients
        await loadPatients();
      }

      // Clear selected test and patient
      setSelectedTest(null);
      setSelectedPatient(null);

      setNotificationMessage("Test deleted successfully!");
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error deleting test:", error);
      setNotificationMessage("Failed to delete test. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  const handleDeleteTestFromList = async (testId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the test when clicking delete

    try {
      await deleteTest(testId);
      console.log("Test deleted successfully");

      // Refresh the data - always refresh regardless of dateParam
      if (dateParam) {
        await preloadByDate(dateParam);
      } else if (selectedPatient) {
        // If viewing by patient, refresh the patient's tests
        await loadTestsForPatient(selectedPatient.id);
      } else {
        // Fallback: reload all patients
        await loadPatients();
      }

      // Clear selected test and patient if the deleted test was selected
      if (selectedTest?.id === testId) {
        setSelectedTest(null);
        setSelectedPatient(null);
      }

      setNotificationMessage("Test deleted successfully!");
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error deleting test:", error);
      setNotificationMessage("Failed to delete test. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  const handleValidateTest = async () => {
    if (!selectedTest) return;
    try {
      // Toggle between reviewed and completed status
      const newStatus = selectedTest.status === "reviewed" ? "completed" : "reviewed";
      await updateTest(selectedTest.id, { status: newStatus });

      // Update the selectedTest state to reflect the new status
      setSelectedTest((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );

      if (dateParam) {
        await preloadByDate(dateParam);
      }
      setNotificationMessage(
        newStatus === "reviewed" 
          ? "Test verified successfully!" 
          : "Test unverified successfully!"
      );
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error toggling test verification:", error);
      setNotificationMessage("Failed to toggle test verification. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedTest) {
      setNotificationMessage("No test selected. Please select a test first.");
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    // Check if we've reached the maximum number of images (10)
    const currentImageCount = selectedTest.microscopic_images?.length || 0;
    if (currentImageCount >= 10) {
      setNotificationMessage(
        "Maximum of 10 images reached. Please delete some images before adding more."
      );
      setNotificationType("error");
      setShowNotification(true);
      return;
    }

    try {
      setNotificationMessage("Uploading image...");
      setNotificationType("info");
      setShowNotification(true);

      // Upload the file to Supabase Storage
      const imageUrl = await uploadImageToStorage(
        file,
        selectedTest.id,
        "microscopic"
      );

      // Add the image URL to the test record
      await addImageToTest(selectedTest.id, imageUrl, "microscopic");

      // Refresh the data to show the new image
      if (dateParam) {
        await preloadByDate(dateParam);
      }

      setNotificationMessage(
        `Image uploaded successfully! (${currentImageCount + 1}/10)`
      );
      setNotificationType("success");
      setShowNotification(true);
    } catch (error) {
      console.error("Error uploading image:", error);
      setNotificationMessage("Failed to upload image. Please try again.");
      setNotificationType("error");
      setShowNotification(true);
    }
  };

  const navigateToTest = (direction: "prev" | "next") => {
    if (!selectedTest) return;

    const currentIndex = tests.findIndex((test) => test.id === selectedTest.id);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === "prev") {
      newIndex = currentIndex - 1;
    } else if (direction === "next") {
      newIndex = currentIndex + 1;
    }

    if (newIndex >= 0 && newIndex < tests.length) {
      const newSelectedTest = tests[newIndex];
      setSelectedTest(newSelectedTest);
      const testPatient = patients.find(
        (p) => p.id === newSelectedTest.patient_id
      );
      if (testPatient) {
        setSelectedPatient(testPatient);
      } else {
        setNotificationMessage(
          `Patient data not found for test: ${newSelectedTest.test_code}`
        );
        setNotificationType("warning");
        setShowNotification(true);
      }
      setNotificationMessage(
        `Navigated to test "${newSelectedTest.test_code}" for ${
          testPatient?.name || "patient"
        }`
      );
      setNotificationType("success");
      setShowNotification(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setNotificationMessage(`No more ${direction} test available.`);
      setNotificationType("info");
      setShowNotification(true);
    }
  };

  const canNavigateToTest = (direction: "prev" | "next") => {
    if (!selectedTest) return false;
    const currentIndex = tests.findIndex((test) => test.id === selectedTest.id);
    if (currentIndex === -1) return false;

    if (direction === "prev") {
      return currentIndex > 0;
    } else if (direction === "next") {
      return currentIndex < tests.length - 1;
    }
    return false;
  };

  return (
    <Suspense fallback={null}>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 relative z-[60]">
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
            {/* Left side - Back button and test info */}
            <div className="flex items-center gap-2 md:gap-4 order-1">
              <Button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                variant="secondary"
                className="h-7 w-7 p-0 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors shadow-sm border border-gray-300 flex items-center justify-center"
                title={
                  sidebarCollapsed ? "Open Patient List" : "Close Patient List"
                }
              >
                <Menu className="h-4 w-4" />
              </Button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <h1 className="text-sm md:text-base font-bold text-gray-900 leading-tight">
                  Microscopy Urinalysis Report
                </h1>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="h-7 px-2.5 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors text-xs font-semibold tracking-tight shadow-sm border border-gray-300 flex items-center">
                    {new Date(
                      selectedDate || new Date().toISOString().split("T")[0]
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  {selectedTest && (
                    <div className="h-7 px-2.5 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors text-xs font-semibold tracking-tight shadow-sm border border-gray-300 flex items-center">
                      {selectedTest.test_code}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center - Test navigation */}
            {selectedTest && (
              <div className="hidden md:flex items-center space-x-2 order-2">
                <button
                  onClick={() => navigateToTest("prev")}
                  disabled={!canNavigateToTest("prev")}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous test"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigateToTest("next")}
                  disabled={!canNavigateToTest("next")}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next test"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-2 md:gap-3 flex-nowrap overflow-x-auto whitespace-nowrap w-full md:w-auto justify-end order-3">
              <Button
                onClick={handleNewPatient}
                variant="default"
                className="h-7 px-2.5 rounded-md bg-gray-700 text-white hover:bg-gray-800 text-xs font-semibold tracking-tight shadow-lg border border-gray-700"
                title="Add new test"
              >
                <Plus className="h-3 w-3" />
                <span className="tracking-tight">Add Test</span>
              </Button>

              {/* Get Samples - attempts request but shows friendly error */}
              <Button
                onClick={async () => {
                  try {
                    const base =
                      process.env.NEXT_PUBLIC_MOTOR_API_BASE ||
                      "http://127.0.0.1:3001";
                    const res = await fetch(`${base}/get_samples`, {
                      method: "POST",
                    });
                    if (!res.ok)
                      throw new Error(`Motor server error ${res.status}`);
                    setNotificationMessage(
                      "Sample collection completed successfully!"
                    );
                    setNotificationType("success");
                    setShowNotification(true);
                  } catch {
                    // Show user-friendly message instead of technical error
                    setNotificationMessage(
                      "Motor control is not supported in this configuration."
                    );
                    setNotificationType("warning");
                    setShowNotification(true);
                  }
                }}
                variant="default"
                className="h-7 px-2.5 rounded-md bg-gray-700 text-white hover:bg-gray-800 flex items-center gap-2 text-xs font-semibold tracking-tight shadow-lg border border-gray-700 relative"
                title="Move stage to sample positions"
              >
                <Microscope className="h-3 w-3" />
                <span className="tracking-tight">Get Samples</span>
                <div className="h-1.5 w-1.5 bg-red-500 rounded-full shadow-sm"></div>
              </Button>

              <div className="flex items-center">
                <button
                  onClick={() => {
                    const nextMode = focusMode === "field" ? "report" : "field";
                    setFocusMode(nextMode);
                    const targetId =
                      nextMode === "field" ? "camera-field" : "report-content";
                    document
                      .getElementById(targetId)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="relative flex items-center bg-gray-200 p-0.5 transition-colors shadow-lg border border-gray-300 text-xs font-semibold tracking-tight rounded-md h-7"
                  title={
                    focusMode === "field"
                      ? "Switch focus to report"
                      : "Switch focus to field"
                  }
                >
                  <span
                    className={`flex items-center justify-center gap-1 w-20 h-full transition-all rounded-md ${
                      focusMode === "field"
                        ? "bg-gray-700 text-white shadow-xl border border-gray-700"
                        : "text-gray-500"
                    }`}
                  >
                    Field
                  </span>
                  <span
                    className={`flex items-center justify-center gap-1 w-20 h-full transition-all rounded-md ${
                      focusMode === "report"
                        ? "bg-gray-700 text-white shadow-xl border border-gray-700"
                        : "text-gray-500"
                    }`}
                  >
                    Report
                  </span>
                </button>
              </div>

              {/* Verify button moved from report header */}
              {selectedTest && (
                <Button
                  onClick={handleValidateTest}
                  variant="default"
                  className={`h-7 px-2.5 rounded-md shadow-lg border transition-colors text-xs font-semibold tracking-tight ${
                    selectedTest.status === "reviewed"
                      ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                      : "bg-red-600 text-white border-red-600 hover:bg-red-700"
                  }`}
                  title={selectedTest.status === "reviewed" ? "Unverify Test" : "Verify Test"}
                >
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden sm:inline tracking-tight">
                    {selectedTest.status === "reviewed" ? "Verified" : "Unverified"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Mobile Overlay */}
          {!sidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}

          {/* Left Sidebar */}
          <div
            className={`${
              sidebarCollapsed ? "hidden" : "w-80"
            } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out fixed top-0 left-0 z-[55] lg:relative lg:top-auto lg:left-auto min-h-0`}
          >
            {/* Mobile Close Button */}
            <div className="lg:hidden flex justify-end p-3 border-b border-gray-200">
              <Button
                onClick={() => setSidebarCollapsed(true)}
                variant="secondary"
                className="h-7 px-2.5 rounded-md bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors text-xs font-semibold tracking-tight shadow-sm border border-gray-300"
                title="Close Patient List"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Fixed Sidebar Header */}
            <div className="p-3 border-b border-gray-200 flex-shrink-0 bg-white">
              {/* Date Selection and Management */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5 w-full relative">
                  <div className="flex-1 relative">
                    <Button
                      ref={strasingerButtonRef}
                      onClick={() => setShowStrasingerModal(!showStrasingerModal)}
                      variant="default"
                      className="w-full h-8 px-3 rounded-md bg-gray-700 text-white hover:bg-gray-800 text-xs font-semibold tracking-tight shadow-lg border border-gray-700"
                      title="Open Strasinger reference"
                    >
                      <span>Strasinger</span>
                    </Button>
                    {/* Dropdown positioned below button */}
                    <div 
                      ref={strasingerDropdownRef}
                      className={`absolute top-full left-0 mt-1 w-[600px] z-[10000] transition-all duration-200 ease-out ${
                        showStrasingerModal 
                          ? 'opacity-100 translate-y-0 pointer-events-auto' 
                          : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                    >
                      <StrasingerReferenceTable
                        onClose={() => setShowStrasingerModal(false)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/management')}
                    variant="default"
                    className="flex-1 h-8 px-3 rounded-md bg-gray-700 text-white hover:bg-gray-800 text-xs font-semibold tracking-tight shadow-lg border border-gray-700"
                    title="Go to Management"
                  >
                    Management
                  </Button>
                </div>
              </div>
              <div className="mb-3">
                <div className="relative w-full">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={
                      selectedDate || new Date().toISOString().split("T")[0]
                    }
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      if (e.target.value) {
                        preloadByDate(e.target.value);
                      }
                    }}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-xs text-black"
                  />
                </div>
              </div>

              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients, test codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-xs text-black placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-3 min-h-0">
              {/* Results Count */}
              <div className="mb-3 text-xs text-gray-600">
                {selectedDate && (
                  <span className="text-gray-900 font-medium">
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="text-gray-600">
                  {" "}
                  • {filteredTests.length} of {tests.length} tests
                </span>
              </div>

              {loading ? (
                <div className="space-y-1.5 mb-3">
                  {/* Skeleton test boxes */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="group relative p-2 rounded-lg bg-gray-100 animate-pulse"
                    >
                      <div className="h-4 bg-gray-200 rounded mb-1.5 w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <div className="text-gray-900 mb-2 text-sm">{error}</div>
                  <button
                    onClick={clearError}
                    className="text-gray-900 hover:text-gray-700 text-xs"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 mb-3">
                    {filteredTests.length === 0 ? (
                      <div className="text-gray-500 text-sm text-center py-4">
                        {tests.length === 0
                          ? "No tests available"
                          : "No tests match your search/filter"}
                      </div>
                    ) : (
                      filteredTests.map((test) => {
                        const patient = patients.find(
                          (p) => p.id === test.patient_id
                        );
                        const isSelected = selectedTest?.id === test.id;
                        return (
                          <div
                            key={test.id}
                            onClick={() => {
                              if (patient) {
                                setSelectedPatient(patient);
                                setSelectedTest(test);
                              }
                            }}
                            className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-gray-700 text-white"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            <div
                              className={`text-xs font-medium ${
                                isSelected ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Test: {test.test_code}
                            </div>
                            <div
                              className={`text-xs ${
                                isSelected ? "text-gray-300" : "text-gray-500"
                              }`}
                            >
                              Status: {test.status}
                            </div>
                            <button
                              onClick={(e) => handleDeleteTestFromList(test.id, e)}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md ${
                                isSelected
                                  ? "text-white hover:bg-gray-800"
                                  : "text-gray-600 hover:bg-gray-300"
                              }`}
                              title="Delete test"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Sidebar - User Info and Logout */}
            <div className="p-4 border-t border-gray-200 mt-auto bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="flex items-center justify-between gap-3">
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 mb-0.5">Signed in as</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {user?.full_name || user?.email || 'User'}
                  </div>
                </div>
                {/* Logout Button */}
                <Button
                  onClick={async () => {
                    try {
                      // Call logout API
                      await fetch('/api/auth/logout', { 
                        method: 'POST',
                        credentials: 'include'
                      });
                      // Clear localStorage
                      localStorage.removeItem('user');
                      localStorage.removeItem('demo_account');
                      localStorage.removeItem('demo_expires_at');
                      // Redirect to home
                      router.push("/");
                    } catch {
                      // Fallback: clear localStorage and redirect
                      localStorage.removeItem('user');
                      localStorage.removeItem('demo_account');
                      localStorage.removeItem('demo_expires_at');
                      window.location.href = "/";
                    }
                  }}
                  variant="outline"
                  className="flex-shrink-0 h-9 px-3.5 rounded-lg bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all duration-200 text-xs font-medium shadow-sm border border-gray-300 group"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5 group-hover:translate-x-0.5 transition-transform" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            className="flex-1 overflow-y-auto relative min-h-0"
            key={selectedPatient?.id || "no-patient"}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-md animate-spin mx-auto mb-4"></div>
                  <div className="text-gray-600">Loading test data...</div>
                </div>
              </div>
            ) : !selectedPatient ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md px-6">
                  <div className="mb-6 flex justify-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-200 rounded-full blur-xl opacity-50"></div>
                      <div className="relative bg-gray-100 rounded-full p-6 border-2 border-gray-300">
                        <ClipboardList className="w-12 h-12 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No Test for Today
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                    There are no tests available for the selected date. Create a new test to get started.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Camera - Always visible with hover controls */}
                <div
                  id="camera-field"
                  className="relative h-full bg-black overflow-hidden group"
                >
                  {liveStreamActive && mediaStream ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <YOLODetectionOverlay
                        videoRef={videoRef}
                        isActive={liveStreamActive && showOverlay}
                        confThreshold={confThreshold}
                        detectionInterval={detectionInterval}
                        showOverlay={showOverlay}
                        showBoundingBox={showBoundingBox}
                        showCrystalName={showCrystalName}
                      />
                    </>
                  ) : (
                    /* Camera placeholder when not available */
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <div className="text-center">
                        {!liveStreamActive ? (
                          <div className="space-y-4">
                            <button
                              onClick={startLiveCamera}
                              className="w-16 h-16 mx-auto mb-4 bg-gray-900 hover:bg-black rounded-md flex items-center justify-center transition-colors cursor-pointer group"
                            >
                              <svg
                                className="w-8 h-8 text-white group-hover:scale-110 transition-transform"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-md flex items-center justify-center">
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                        <p className="text-gray-400 text-sm">
                          {!liveStreamActive
                            ? "Click camera icon to start or use Test AI button"
                            : "Camera access denied or unavailable"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hover Controls - Only show when hovering over camera */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 z-10">
                    {/* Bottom Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-md px-3 py-2 border border-white/20 shadow-lg">
                        <button
                          onClick={() =>
                            setPowerMode((v) => (v === "high" ? "low" : "high"))
                          }
                          className={`px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 text-xs font-medium ${
                            powerMode === "high"
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-red-600 text-white hover:bg-red-700"
                          }`}
                        >
                          <Microscope className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {powerMode === "high" ? "HPF" : "LPF"} (
                            {powerMode === "high"
                              ? highPowerImages.length
                              : lowPowerImages.length}
                            /10)
                          </span>
                        </button>
                        <button
                          onClick={captureImage}
                          disabled={
                            !liveStreamActive ||
                            !mediaStream ||
                            (powerMode === "high"
                              ? highPowerImages.length >= 10
                              : lowPowerImages.length >= 10)
                          }
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium flex items-center justify-center gap-1.5 disabled:bg-gray-600 disabled:cursor-not-allowed shadow-lg"
                        >
                          <Plus className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            Capture
                          </span>
                        </button>
                        {/* Settings Button */}
                        <div className="relative">
                          <button
                            ref={settingsButtonRef}
                            onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                            className="px-2.5 py-1.5 bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-md transition-colors flex items-center justify-center"
                            title="Settings"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                          {/* Settings Dropdown */}
                          {showSettingsDropdown && (
                            <div
                              ref={settingsDropdownRef}
                              className="absolute bottom-full right-0 mb-2 w-64 bg-gray-800/95 backdrop-blur-md rounded-lg border border-white/20 shadow-xl p-4 z-50"
                            >
                              <h4 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Detection Settings
                              </h4>
                              <div className="space-y-4">
                                {/* Confidence Threshold */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-2">
                                    Confidence: {confThreshold}
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={confThreshold}
                                    onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                  />
                                </div>
                                {/* Detection Rate */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-300 mb-2">
                                    Detection Rate: {Math.round(1000 / detectionInterval)} FPS ({detectionInterval}ms)
                                  </label>
                                  <input
                                    type="range"
                                    min="200"
                                    max="1000"
                                    step="100"
                                    value={detectionInterval}
                                    onChange={(e) =>
                                      setDetectionInterval(parseInt(e.target.value))
                                    }
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                  />
                                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                                    <span>1 FPS</span>
                                    <span>5 FPS</span>
                                  </div>
                                </div>
                                {/* Overlay Settings */}
                                <div className="pt-2 border-t border-white/10">
                                  <label className="flex items-center gap-2 text-xs font-medium text-gray-300 mb-3">
                                    <input
                                      type="checkbox"
                                      checked={showOverlay}
                                      onChange={(e) => setShowOverlay(e.target.checked)}
                                      className="w-4 h-4 rounded accent-blue-500"
                                    />
                                    Show Overlay
                                  </label>
                                  {showOverlay && (
                                    <div className="ml-6 space-y-2">
                                      <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                        <input
                                          type="checkbox"
                                          checked={showBoundingBox}
                                          onChange={(e) => setShowBoundingBox(e.target.checked)}
                                          className="w-3.5 h-3.5 rounded accent-blue-500"
                                        />
                                        Bounding Box
                                      </label>
                                      <label className="flex items-center gap-2 text-xs font-medium text-gray-400">
                                        <input
                                          type="checkbox"
                                          checked={showCrystalName}
                                          onChange={(e) => setShowCrystalName(e.target.checked)}
                                          className="w-3.5 h-3.5 rounded accent-blue-500"
                                        />
                                        Crystal Name
                                      </label>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side Info */}
                    <div className="absolute top-1/2 right-4 -translate-y-1/2">
                      <div className="bg-black/60 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20">
                        <div className="text-white text-sm">
                          <div className="font-medium">
                            {liveStreamActive && mediaStream
                              ? "Live Camera Feed"
                              : "Camera Offline"}
                          </div>
                          <div className="text-white/70 text-xs mt-1">
                            <div
                              className={`${
                                powerMode === "high"
                                  ? "text-gray-400 font-semibold"
                                  : ""
                              }`}
                            >
                              HPF: {highPowerImages.length}/10{" "}
                              {highPowerImages.length >= 10 ? "✓" : ""}
                            </div>
                            <div
                              className={`${
                                powerMode === "low"
                                  ? "text-gray-500 font-semibold"
                                  : ""
                              }`}
                            >
                              LPF: {lowPowerImages.length}/10{" "}
                              {lowPowerImages.length >= 10 ? "✓" : ""}
                            </div>
                          </div>
                          {lowPowerImages.length >= 10 &&
                            highPowerImages.length >= 10 && (
                              <div className="text-gray-400 text-xs mt-1 font-semibold">
                                All fields captured!
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Content */}

                {showHeader ? (
                  <div
                    id="report-content"
                    className="bg-white rounded-lg p-2 shadow-sm mb-2 relative"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h1 className="text-sm md:text-base font-bold text-gray-900">
                        Microscopic Urine Analysis Report -{" "}
                        {selectedTest?.test_code || "N/A"}
                      </h1>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleEditToggle}
                          className={`h-6 inline-flex items-center gap-1 px-2 rounded transition-colors text-xs ${
                            isEditing
                              ? "bg-gray-300 text-gray-800 hover:bg-gray-400"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {isEditing ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Edit className="h-3 w-3" />
                          )}
                          <span>{isEditing ? "Cancel" : "Edit"}</span>
                        </button>
                        {isEditing && (
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`h-6 inline-flex items-center gap-1 bg-gray-900 text-white px-2 rounded hover:bg-black transition-colors disabled:opacity-50 text-xs`}
                          >
                            <Save className="h-3 w-3" />
                            <span>{saving ? "Saving..." : "Save"}</span>
                          </button>
                        )}
                        {selectedTest && (
                          <button
                            onClick={handleDeleteTest}
                            className="h-6 inline-flex items-center gap-1 px-2 rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors text-xs"
                            title="Delete Test"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Name:
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.patientName}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  patientName: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedPatient.name}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Patient ID:
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {selectedPatient.patient_id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Age:
                          </span>
                          {isEditing ? (
                            <input
                              type="number"
                              value={editData.patientAge}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  patientAge: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500 w-14"
                              min="0"
                              max="150"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedPatient.age} Years
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Gender:
                          </span>
                          {isEditing ? (
                            <select
                              value={editData.patientGender}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  patientGender: e.target.value as
                                    | "male"
                                    | "female"
                                    | "other",
                                }))
                              }
                              className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            >
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedPatient.gender ? selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1) : 'N/A'}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Collection Time:
                          </span>
                          {isEditing ? (
                            <input
                              type="time"
                              value={editData.collectionTime}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  collectionTime: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedTest?.collection_time || "N/A"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Analysis Date:
                          </span>
                          <span className="text-xs font-semibold text-gray-900">
                            {selectedTest?.analysis_date || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-700 font-medium">
                            Technician:
                          </span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.technician}
                              onChange={(e) =>
                                setEditData((prev) => ({
                                  ...prev,
                                  technician: e.target.value,
                                }))
                              }
                              className="text-xs font-semibold text-gray-900 bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedTest?.technician || "N/A"}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-700 font-medium">
                            Status:
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold tracking-tight ${
                              selectedTest?.status === "pending"
                                ? "bg-gray-100 text-gray-700 border border-gray-300"
                                : selectedTest?.status === "completed"
                                ? "bg-gray-900 text-white border border-gray-900 shadow-sm"
                                : selectedTest?.status === "in_progress"
                                ? "bg-gray-500 text-white border border-gray-600 shadow-sm"
                                : selectedTest?.status === "reviewed"
                                ? "bg-gray-200 text-gray-800 border border-gray-300"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {selectedTest?.status === "reviewed"
                              ? "VERIFIED"
                              : selectedTest?.status === "completed"
                              ? "UNVERIFIED"
                              : selectedTest?.status
                              ?.replace("_", " ")
                              .toUpperCase() || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Low Power Field Images Section */}
                <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Microscope className="h-4 w-4 mr-2 text-gray-900" />
                      Low Power Field (LPF)
                      <span className="ml-2 text-xs text-gray-600 font-normal">
                        - Overview Analysis
                      </span>
                      <span
                        className={`ml-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                          lowPowerImages.length >= 10
                            ? "text-white bg-gray-900 border border-gray-900 shadow-sm"
                            : lowPowerImages.length >= 7
                            ? "text-gray-800 bg-gray-200 border border-gray-300"
                            : "text-gray-600 bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <span>{lowPowerImages.length}/10</span>
                        {lowPowerImages.length >= 10 && (
                          <span className="text-[8px]">✓</span>
                        )}
                      </span>
                    </h3>
                    <label
                      htmlFor="lpf-image-upload"
                      className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                      title="Upload LPF Image"
                    >
                      Upload Image
                    </label>
                  </div>
                </div>

                  {/* LPF Photo Gallery */}
                  <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden mb-4">
                    <div className="flex h-[500px]">
                      {/* Main Image Display */}
                      <div className="w-[500px] bg-gray-100 flex items-center justify-center relative py-2">
                        {lowPowerImages.length > 0 ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img
                              ref={lpfImageRef}
                              src={lowPowerImages[currentLPFIndex]}
                              alt="LPF Sample"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                console.error(
                                  "Failed to load image:",
                                  lowPowerImages[currentLPFIndex]
                                );
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />
                            {lpfYoloDetections && lpfYoloDetections.predictions.length > 0 && (
                              <BoundingBoxOverlay
                                imageRef={lpfImageRef}
                                detections={lpfYoloDetections.predictions}
                                highlightedDetectionId={highlightedDetection}
                                showBoundingBoxes={showBoundingBox}
                              />
                            )}
                            {/* Toggle Overlay Button */}
                            {lpfYoloDetections && lpfYoloDetections.predictions.length > 0 && (
                              <button
                                onClick={() => setShowBoundingBox(!showBoundingBox)}
                                className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded-md hover:bg-black/90 transition-colors z-10"
                                title={showBoundingBox ? "Hide bounding boxes" : "Show bounding boxes"}
                              >
                                {showBoundingBox ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-gray-400">
                              No LPF image selected
                            </p>
                          </div>
                        )}

                        {/* Navigation Controls - Bottom Center */}
                        {lowPowerImages.length > 1 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                            <button
                              onClick={() =>
                                setCurrentLPFIndex((prev) =>
                                  prev > 0
                                    ? prev - 1
                                    : lowPowerImages.length - 1
                                )
                              }
                              className="bg-black/70 text-white px-3 py-1.5 rounded-md hover:bg-black/90 transition-colors flex items-center justify-center"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="bg-black/70 text-white px-3 py-1.5 rounded-md text-sm flex items-center justify-center min-w-[3rem]">
                              {Math.min(
                                currentLPFIndex + 1,
                                lowPowerImages.length
                              )}{" "}
                              / {lowPowerImages.length}
                            </div>
                            <button
                              onClick={() =>
                                setCurrentLPFIndex((prev) =>
                                  prev < lowPowerImages.length - 1
                                    ? prev + 1
                                    : 0
                                )
                              }
                              className="bg-black/70 text-white px-3 py-1.5 rounded-md hover:bg-black/90 transition-colors flex items-center justify-center"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button
                            onClick={() => recountImage("low")}
                            className="bg-gray-900 text-white p-2 rounded-md hover:bg-black transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                            title="Recount current image"
                            disabled={lowPowerImages.length === 0}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (lowPowerImages.length === 0) return;
                              removeCapturedImage(currentLPFIndex, "low");
                            }}
                            className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors shadow-lg disabled:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete current image"
                            disabled={lowPowerImages.length === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Sidebar - Sediment Description */}
                      <div className="flex-1 bg-white border-l-2 border-gray-300 p-3">
                        <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                          LPF Sediment Analysis
                        </h4>

                        {/* Loading Indicator */}
                        {isAnalyzingLPF[currentLPFIndex] === true && (
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Analyzing image...</span>
                            </div>
                          </div>
                        )}

                        {/* Field-based Sediment Analysis Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                  Mucus Threads
                                </th>
                                <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                  Casts
                                </th>
                                <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                  Squamous Epithelial
                                </th>
                                <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                  Abnormal Crystals
                                </th>
                              </tr>
                            </thead>
                            <tbody className="text-xs">
                              <tr className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (lpfSedimentDetection?.mucus_threads ||
                                            0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            lpfSedimentDetection?.mucus_threads || 0
                                          }
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setLpfSedimentDetection((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    mucus_threads: newValue,
                                                  }
                                                : {
                                                    epithelial_cells: 0,
                                                    mucus_threads: newValue,
                                                    casts: 0,
                                                    squamous_epithelial: 0,
                                                    abnormal_crystals: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveLPFCountToDatabase(
                                                "mucus_threads",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getLPFCroppedImagesByClass('mucus_threads').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getLPFCroppedImagesByClass('mucus_threads').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Mucus Thread"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (lpfSedimentDetection?.casts || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={lpfSedimentDetection?.casts || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setLpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, casts: newValue }
                                                : {
                                                    epithelial_cells: 0,
                                                    mucus_threads: 0,
                                                    casts: newValue,
                                                    squamous_epithelial: 0,
                                                    abnormal_crystals: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveLPFCountToDatabase(
                                                "casts",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getLPFCroppedImagesByClass('casts').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getLPFCroppedImagesByClass('casts').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Cast"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (lpfSedimentDetection?.squamous_epithelial ||
                                            0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            lpfSedimentDetection?.squamous_epithelial ||
                                            0
                                          }
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setLpfSedimentDetection((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    squamous_epithelial: newValue,
                                                  }
                                                : {
                                                    epithelial_cells: 0,
                                                    mucus_threads: 0,
                                                    casts: 0,
                                                    squamous_epithelial: newValue,
                                                    abnormal_crystals: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveLPFCountToDatabase(
                                                "squamous_epithelial",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getLPFCroppedImagesByClass('squamous_epithelial').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getLPFCroppedImagesByClass('squamous_epithelial').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Squamous Epithelial"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (lpfSedimentDetection?.abnormal_crystals ||
                                            0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            lpfSedimentDetection?.abnormal_crystals ||
                                            0
                                          }
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setLpfSedimentDetection((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    abnormal_crystals: newValue,
                                                  }
                                                : {
                                                    epithelial_cells: 0,
                                                    mucus_threads: 0,
                                                    casts: 0,
                                                    squamous_epithelial: 0,
                                                    abnormal_crystals: newValue,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveLPFCountToDatabase(
                                                "abnormal_crystals",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getLPFCroppedImagesByClass('abnormal_crystals').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getLPFCroppedImagesByClass('abnormal_crystals').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Abnormal Crystal"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Remarks Row */}
                              {lpfSedimentDetection && lpfSedimentDetection.analysis_notes && (
                                <tr className="border-t-2 border-gray-300 bg-gray-50">
                                  <td colSpan={5} className="py-2 px-3 text-left">
                                    <div className="text-xs">
                                      <span className="font-semibold text-gray-700">Remarks: </span>
                                      <span className="text-gray-600">
                                        {lpfSedimentDetection.analysis_notes}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Loading indicator for LPF analysis */}
                        {isAnalyzingLPF[currentLPFIndex] === true && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                            <div className="flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-md animate-spin mr-2"></div>
                              <span className="text-sm text-gray-700 font-medium">
                                Analyzing LPF image...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                {/* High Power Field Images Section */}
                <div className="bg-white rounded-lg p-3 shadow-sm mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Microscope className="h-4 w-4 mr-2 text-gray-900" />
                      High Power Field (HPF)
                      <span className="ml-2 text-xs text-gray-600 font-normal">
                        - Microscopic Analysis
                      </span>
                      <span
                        className={`ml-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                          highPowerImages.length >= 10
                            ? "text-white bg-gray-900 border border-gray-900 shadow-sm"
                            : highPowerImages.length >= 7
                            ? "text-gray-800 bg-gray-200 border border-gray-300"
                            : "text-gray-600 bg-gray-100 border border-gray-200"
                        }`}
                      >
                        <span>{highPowerImages.length}/10</span>
                        {highPowerImages.length >= 10 && (
                          <span className="text-[8px]">✓</span>
                        )}
                      </span>
                    </h3>
                    <label
                      htmlFor="hpf-image-upload"
                      className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition-colors cursor-pointer"
                      title="Upload HPF Image"
                    >
                      Upload Image
                    </label>
                  </div>
                </div>

                {/* HPF Photo Gallery */}
                <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden mb-4">
                  <div className="flex h-[500px]">
                    {/* Main Image Display */}
                    <div className="w-[500px] bg-gray-100 flex items-center justify-center relative py-2">
                        {highPowerImages.length > 0 ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img
                              ref={hpfImageRef}
                              src={highPowerImages[currentHPFIndex]}
                              alt="HPF Sample"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                console.error(
                                  "Failed to load image:",
                                  highPowerImages[currentHPFIndex]
                                );
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            {hpfYoloDetections && hpfYoloDetections.predictions.length > 0 && (
                              <BoundingBoxOverlay
                                imageRef={hpfImageRef}
                                detections={hpfYoloDetections.predictions}
                                highlightedDetectionId={highlightedDetection}
                                showBoundingBoxes={showBoundingBox}
                              />
                            )}
                            {/* Toggle Overlay Button */}
                            {hpfYoloDetections && hpfYoloDetections.predictions.length > 0 && (
                              <button
                                onClick={() => setShowBoundingBox(!showBoundingBox)}
                                className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded-md hover:bg-black/90 transition-colors z-10"
                                title={showBoundingBox ? "Hide bounding boxes" : "Show bounding boxes"}
                              >
                                {showBoundingBox ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-sm text-gray-400">
                            No HPF image selected
                          </p>
                        </div>
                      )}

                      {/* Navigation Controls - Bottom Center */}
                      {highPowerImages.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                          <button
                            onClick={() =>
                              setCurrentHPFIndex((prev) =>
                                prev > 0
                                  ? prev - 1
                                  : highPowerImages.length - 1
                              )
                            }
                            className="bg-black/70 text-white px-3 py-1.5 rounded-md hover:bg-black/90 transition-colors flex items-center justify-center"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <div className="bg-black/70 text-white px-3 py-1.5 rounded-md text-sm flex items-center justify-center min-w-[3rem]">
                            {Math.min(
                              currentHPFIndex + 1,
                              highPowerImages.length
                            )}{" "}
                            / {highPowerImages.length}
                          </div>
                          <button
                            onClick={() =>
                              setCurrentHPFIndex((prev) =>
                                prev < highPowerImages.length - 1
                                  ? prev + 1
                                  : 0
                              )
                            }
                            className="bg-black/70 text-white px-3 py-1.5 rounded-md hover:bg-black/90 transition-colors flex items-center justify-center"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <button
                          onClick={() => recountImage("high")}
                          className="bg-gray-900 text-white p-2 rounded-md hover:bg-black transition-colors shadow-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                          title="Recount current image"
                          disabled={highPowerImages.length === 0}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                          <button
                            onClick={() => {
                              if (highPowerImages.length === 0) return;
                              removeCapturedImage(currentHPFIndex, "high");
                            }}
                            className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors shadow-lg disabled:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete current image"
                            disabled={highPowerImages.length === 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                      </div>
                    </div>

                    {/* Sidebar - Sediment Description */}
                    <div className="flex-1 bg-white border-l-2 border-gray-300 p-3">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                        HPF Sediment Analysis
                      </h4>

                      {/* Loading Indicator */}
                      {isAnalyzingHPF[currentHPFIndex] === true && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <div className="flex items-center justify-center gap-2 text-xs text-blue-700">
                            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Analyzing image...</span>
                          </div>
                        </div>
                      )}

                      {/* Field-based Sediment Analysis Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                RBC
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                WBC
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Epithelial Cells
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Crystals
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Bacteria
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Yeast
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Sperm
                              </th>
                              <th className="text-center py-2 px-2 font-semibold text-gray-700">
                                Parasites
                              </th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            <tr className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.rbc || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.rbc || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, rbc: newValue }
                                                : {
                                                    rbc: newValue,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "rbc",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('rbc').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('rbc').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="RBC"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.wbc || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.wbc || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, wbc: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: newValue,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "wbc",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('wbc').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('wbc').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="WBC"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.epithelial_cells ||
                                            0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={
                                            hpfSedimentDetection?.epithelial_cells ||
                                            0
                                          }
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? {
                                                    ...prev,
                                                    epithelial_cells: newValue,
                                                  }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: newValue,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "epithelial_cells",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('epithelial_cells').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('epithelial_cells').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Epithelial Cell"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.crystals || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.crystals || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, crystals: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: newValue,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "crystals",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('crystals').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('crystals').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Crystal"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.bacteria || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.bacteria || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, bacteria: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: newValue,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "bacteria",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('bacteria').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('bacteria').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Bacteria"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.yeast || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.yeast || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, yeast: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: newValue,
                                                    sperm: 0,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "yeast",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('yeast').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('yeast').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Yeast"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.sperm || 0) > 0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.sperm || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, sperm: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: newValue,
                                                    parasites: 0,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "sperm",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('sperm').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('sperm').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Sperm"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center py-2 px-2 align-top">
                                  <div className="flex flex-col items-center gap-2 w-full">
                                    {/* Count input container - fixed width, no stretching */}
                                    <div className="flex justify-center w-full">
                                      <div
                                        className={`rounded px-3 py-1 text-xs font-medium w-[60px] flex-shrink-0 ${
                                          (hpfSedimentDetection?.parasites || 0) >
                                          0
                                            ? "bg-gray-200 text-gray-700"
                                            : "bg-gray-50 text-gray-500"
                                        }`}
                                      >
                                        <input
                                          type="number"
                                          min="0"
                                          value={hpfSedimentDetection?.parasites || 0}
                                          onChange={(e) => {
                                            const newValue =
                                              parseInt(e.target.value) || 0;
                                            setHpfSedimentDetection((prev) =>
                                              prev
                                                ? { ...prev, parasites: newValue }
                                                : {
                                                    rbc: 0,
                                                    wbc: 0,
                                                    epithelial_cells: 0,
                                                    crystals: 0,
                                                    bacteria: 0,
                                                    yeast: 0,
                                                    sperm: 0,
                                                    parasites: newValue,
                                                    confidence: 0,
                                                    analysis_notes: "",
                                                  }
                                            );
                                            // Auto-save to database
                                            if (selectedTest) {
                                              saveHPFCountToDatabase(
                                                "parasites",
                                                newValue
                                              );
                                            }
                                          }}
                                          className="w-full text-center text-xs bg-transparent border-none outline-none focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </div>
                                    {/* Cropped images gallery - separate container */}
                                    {getHPFCroppedImagesByClass('parasites').length > 0 && (
                                      <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto items-center">
                                        {getHPFCroppedImagesByClass('parasites').map((item) => (
                                          <img
                                            key={item.id}
                                            src={item.image}
                                            alt="Parasite"
                                            className={`w-12 h-12 object-cover rounded cursor-pointer border-2 transition-all ${
                                              highlightedDetection === item.id
                                                ? 'border-red-500 shadow-lg'
                                                : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            onClick={() => setHighlightedDetection(
                                              highlightedDetection === item.id ? null : item.id
                                            )}
                                            title={`Confidence: ${(item.confidence * 100).toFixed(1)}%`}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                              {/* Remarks Row */}
                              {hpfSedimentDetection && hpfSedimentDetection.analysis_notes && (
                                <tr className="border-t-2 border-gray-300 bg-gray-50">
                                  <td colSpan={8} className="py-2 px-3 text-left">
                                    <div className="text-xs">
                                      <span className="font-semibold text-gray-700">Remarks: </span>
                                      <span className="text-gray-600">
                                        {hpfSedimentDetection.analysis_notes}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Loading indicator for HPF analysis */}
                        {isAnalyzingHPF[currentHPFIndex] === true && (
                          <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                            <div className="flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-md animate-spin mr-2"></div>
                              <span className="text-sm text-gray-700 font-medium">
                                Analyzing HPF image...
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                

                {/* Hidden file inputs */}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                />
                <input
                  id="camera-capture"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      // Handle camera capture logic here
                      console.log("Camera capture:", files);
                      // You can implement the actual upload to Supabase storage here
                    }
                  }}
                />
                <input
                  id="lpf-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleLPFImageUpload(file);
                    }
                  }}
                />
                <input
                  id="hpf-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleHPFImageUpload(file);
                    }
                  }}
                />
                {selectedTest && (
                  <div className="space-y-4">
                    {/* Display captured microscopic images */}
                    {selectedTest.microscopic_images &&
                    selectedTest.microscopic_images.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedTest.microscopic_images.map(
                          (imageUrl, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">
                                  Sample {index + 1}
                                </h4>
                                <button
                                  onClick={async () => {
                                    try {
                                      await deleteImageFromTest(
                                        selectedTest.id,
                                        imageUrl,
                                        "microscopic"
                                      );
                                      await deleteImageFromStorage(imageUrl);
                                      // Refresh the data
                                      if (dateParam) {
                                        await preloadByDate(dateParam);
                                      }
                                      setNotificationMessage(
                                        "Image deleted successfully!"
                                      );
                                      setNotificationType("success");
                                      setShowNotification(true);
                                    } catch (error) {
                                      console.error(
                                        "Error deleting image:",
                                        error
                                      );
                                      setNotificationMessage(
                                        "Failed to delete image. Please try again."
                                      );
                                      setNotificationType("error");
                                      setShowNotification(true);
                                    }
                                  }}
                                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Delete image"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="relative group">
                                <div className="relative w-full h-64 rounded-lg border border-gray-200 shadow-lg overflow-hidden bg-black">
                                  {/* Main Image */}
                                  {imageUrl.startsWith("data:") ? (
                                    // Handle base64 images
                                    <Image
                                      src={imageUrl}
                                      alt={`Microscopic image ${index + 1}`}
                                      width={400}
                                      height={320}
                                      className="w-full h-full object-contain relative z-10"
                                      unoptimized
                                      onError={(e) => {
                                        console.error(
                                          "Image failed to load:",
                                          imageUrl
                                        );
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="flex items-center justify-center h-full">
                                              <div class="text-center">
                                                <Microscope class="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                                <p class="text-sm text-gray-500">Image failed to load</p>
                                              </div>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  ) : (
                                    // Handle URL images
                                    <Image
                                      src={imageUrl}
                                      alt={`Microscopic image ${index + 1}`}
                                      width={400}
                                      height={320}
                                      className="w-full h-full object-contain relative z-10"
                                      unoptimized={imageUrl.startsWith("http")}
                                      onError={(e) => {
                                        console.error(
                                          "Image failed to load:",
                                          imageUrl
                                        );
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="flex items-center justify-center h-full">
                                              <div class="text-center">
                                                <Microscope class="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                                <p class="text-sm text-gray-500">Image failed to load</p>
                                              </div>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  )}

                                  {/* Measurement Overlay (below image) */}
                                  <div className="absolute inset-0 pointer-events-none z-0">
                                    <svg className="w-full h-full">
                                      <line
                                        x1="10%"
                                        y1="10%"
                                        x2="90%"
                                        y2="90%"
                                        stroke="red"
                                        strokeWidth="2"
                                        markerEnd="url(#arrowhead)"
                                      />
                                      <defs>
                                        <marker
                                          id="arrowhead"
                                          markerWidth="10"
                                          markerHeight="7"
                                          refX="9"
                                          refY="3.5"
                                          orient="auto"
                                        >
                                          <polygon
                                            points="0 0, 10 3.5, 0 7"
                                            fill="red"
                                          />
                                        </marker>
                                      </defs>
                                    </svg>
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                      <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-bold">
                                        L: 1.78mm
                                      </div>
                                    </div>
                                  </div>

                                  {/* Click to Enlarge Overlay (below image) */}
                                  <div className="absolute inset-0 z-0 pointer-events-none bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 px-3 py-1 rounded-md text-sm font-medium text-gray-800 shadow-sm">
                                      Click to enlarge
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mt-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-700">
                                      <strong>Captured:</strong>{" "}
                                      {new Date().toLocaleDateString()}
                                    </p>
                                    <p className="text-gray-600">
                                      <strong>Type:</strong> Microscopic
                                      analysis
                                    </p>
                                  </div>
                                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border">
                                    Sample {index + 1}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                )}


                {/* Text-only Urinalysis Summary (based on provided report) */}
                <div className="bg-white rounded-t-xl p-3 sm:p-4 shadow-md border border-gray-100 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Urinalysis Summary
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Microscopic */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-700 mb-1">
                        Microscopic
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-medium text-gray-800">
                            Red Blood Cells (RBC)
                          </span>
                          <select
                            value={urinalysisText.rbc}
                            onChange={(e) =>
                              updateUrinalysisText("rbc", e.target.value)
                            }
                            className="w-28 text-xs text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-400"
                          >
                            {getDropdownOptions("rbcs").map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-medium text-gray-800">Pus Cells (WBC)</span>
                          <select
                            value={urinalysisText.pusCells}
                            onChange={(e) =>
                              updateUrinalysisText("pusCells", e.target.value)
                            }
                            className="w-28 text-xs text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-400"
                          >
                            {getDropdownOptions("rbcs").map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-medium text-gray-800">Epithelial Cells</span>
                          <select
                            value={urinalysisText.epithelialCells}
                            onChange={(e) =>
                              updateUrinalysisText(
                                "epithelialCells",
                                e.target.value
                              )
                            }
                            className="w-28 text-xs text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-400"
                          >
                            {getDropdownOptions("epithelialCells").map(
                              (option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-3 py-0.5">
                          <span className="text-xs font-medium text-gray-800">Bacteria</span>
                          <select
                            value={urinalysisText.bacteria}
                            onChange={(e) =>
                              updateUrinalysisText("bacteria", e.target.value)
                            }
                            className="w-28 text-xs text-gray-900 bg-white border border-gray-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-400"
                          >
                            {getDropdownOptions("bacteria").map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-1 md:col-span-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-700 mb-1">
                        Remarks
                      </div>
                      <textarea
                        value={urinalysisText.remarks}
                        onChange={(e) =>
                          updateUrinalysisText("remarks", e.target.value)
                        }
                        placeholder="Enter remarks here"
                        className="w-full resize-y min-h-[60px] text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Image Modal */}
        <div className="z-[9999]">
          <ImageModal
            isOpen={!!modalImage}
            onClose={() => setModalImage(null)}
            imageSrc={modalImage?.src || ""}
            imageAlt={modalImage?.alt || ""}
            title={modalImage?.title || ""}
          />
        </div>

        {/* Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-[9999]">
            <Notification
              message={notificationMessage}
              type={notificationType}
              onClose={() => setShowNotification(false)}
              duration={4000}
            />
          </div>
        )}
      </div>
    </Suspense>
  );
}
