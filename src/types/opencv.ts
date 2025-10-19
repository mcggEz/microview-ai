export interface CVScalar {
  [key: string]: unknown
}

export interface CVSize {
  [key: string]: unknown
}

export interface CVPoint {
  [key: string]: unknown
}

export interface CVMat {
  delete(): void
  rows: number
  cols: number
  empty(): boolean
  get?:(...args: unknown[]) => unknown
  clone?: () => CVMat
  data?: unknown
  [key: string]: unknown
}

export interface CVMatVector {
  size(): number
  get(index: number): CVMat
  delete(): void
  [key: string]: unknown
}

export interface OpenCV {
  Mat: new (...args: unknown[]) => CVMat
  MatVector: new (...args: unknown[]) => CVMatVector
  Size: new (...args: number[]) => CVSize
  Point: new (...args: number[]) => CVPoint
  Scalar: new (...args: number[]) => CVScalar
  matFromImageData: (...args: unknown[]) => CVMat
  imread: (...args: unknown[]) => CVMat
  matFromArray?: (...args: unknown[]) => CVMat
  cvtColor: (...args: unknown[]) => void
  threshold: (...args: unknown[]) => void
  getStructuringElement: (...args: unknown[]) => unknown
  morphologyEx: (...args: unknown[]) => void
  contourArea: (...args: unknown[]) => number
  findContours: (...args: unknown[]) => void
  drawContours: (...args: unknown[]) => void
  addWeighted: (...args: unknown[]) => void
  flip: (...args: unknown[]) => void
  bitwise_not: (...args: unknown[]) => void
  imshow: (...args: unknown[]) => void
  COLOR_RGBA2GRAY: number
  THRESH_BINARY: number
  MORPH_RECT: number
  MORPH_OPEN: number
  MORPH_CLOSE: number
  RETR_EXTERNAL: number
  CHAIN_APPROX_SIMPLE: number
  CV_8UC4: number
  onRuntimeInitialized?: () => void
  [key: string]: unknown
}
