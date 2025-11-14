/**
 * OpenCV.js loading utility to prevent duplicate loading and binding conflicts
 */

import { useState, useEffect } from 'react'
import type { OpenCV } from '@/types/opencv'

declare global {
  interface Window {
    cv: OpenCV | null
    opencvLoadingPromise?: Promise<boolean>
  }
}

let opencvLoadingPromise: Promise<boolean> | null = null

/**
 * Loads OpenCV.js with proper duplicate prevention
 * @returns Promise that resolves to true when OpenCV is ready
 */
export function loadOpenCV(): Promise<boolean> {
  // Return existing promise if already loading
  if (opencvLoadingPromise) {
    return opencvLoadingPromise
  }

  // Check if already loaded
  if (typeof window !== 'undefined' && window.cv && window.cv.Mat) {
    return Promise.resolve(true)
  }

  // Add global error handler for OpenCV binding errors
  if (typeof window !== 'undefined') {
    const originalError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof message === 'string' && message.includes('IntVector')) {
        console.warn('OpenCV IntVector binding error caught and handled:', message)
        return true // Prevent the error from propagating
      }
      // Call original error handler for other errors
      if (originalError) {
        return originalError(message, source, lineno, colno, error)
      }
      return false
    }
  }

  // Create new loading promise
  opencvLoadingPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="opencv.js"]')
    
    if (existingScript) {
      // Wait for existing script to load
      existingScript.addEventListener('load', () => {
        if (window.cv && window.cv.Mat) {
          resolve(true)
        } else {
          reject(new Error('OpenCV failed to initialize'))
        }
      })
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load OpenCV.js'))
      })
      return
    }

    // Create new script
    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
    script.async = true
    script.id = 'opencv-js-script'
    
    script.onload = () => {
      if (window.cv) {
        // Set up runtime initialization callback
        window.cv.onRuntimeInitialized = () => {
          console.log('OpenCV.js loaded and initialized successfully')
          resolve(true)
        }
      } else {
        reject(new Error('OpenCV object not found after script load'))
      }
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load OpenCV.js script'))
    }
    
    document.head.appendChild(script)
  })

  return opencvLoadingPromise
}

/**
 * Checks if OpenCV is ready to use
 */
export function isOpenCVReady(): boolean {
  return typeof window !== 'undefined' && !!(window.cv && window.cv.Mat)
}

/**
 * Resets the loading state (useful for testing or error recovery)
 */
export function resetOpenCVLoading(): void {
  opencvLoadingPromise = null
}

/**
 * Hook for React components to safely use OpenCV
 * @returns Object with loading state and OpenCV instance
 */
export function useOpenCV() {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const initializeOpenCV = async () => {
      if (isOpenCVReady()) {
        if (isMounted) {
          setIsReady(true)
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        await loadOpenCV()
        if (isMounted) {
          setIsReady(true)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load OpenCV')
          setIsLoading(false)
        }
      }
    }

    initializeOpenCV()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    isReady,
    isLoading,
    error,
    opencv: isReady ? window.cv : null
  }
}
