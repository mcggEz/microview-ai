-- Add YOLO detection data to image_analysis table
-- This stores the raw YOLO detection results (bounding boxes, classes, confidence) as JSONB

ALTER TABLE image_analysis
ADD COLUMN IF NOT EXISTS yolo_detections JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN image_analysis.yolo_detections IS 'YOLO detection results stored as JSONB. Contains predictions array with bounding boxes (x, y, width, height), class names, confidence scores, and detection_ids. Also includes summary with total_detections and by_class counts.';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_image_analysis_yolo_detections ON image_analysis USING GIN (yolo_detections);

