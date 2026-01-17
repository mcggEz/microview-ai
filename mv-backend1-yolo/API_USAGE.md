# API Usage Guide

This Hugging Face Space provides a **pure API endpoint** (no UI) for urine sediment detection.

## API Endpoint

```
POST https://mcggEz-urine-sediment.hf.space/api/predict
```

## Request Format

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `image`: Image file (JPEG, PNG, etc.)
- `conf`: Confidence threshold (0.0-1.0), optional, default: 0.25

## Example Request (cURL)

```bash
curl -X POST https://mcggEz-urine-sediment.hf.space/api/predict \
  -F "image=@path/to/image.jpg" \
  -F "conf=0.25"
```

## Example Request (JavaScript/Fetch)

```javascript
const formData = new FormData()
formData.append('image', imageFile)
formData.append('conf', '0.25')

const response = await fetch('https://mcggEz-urine-sediment.hf.space/api/predict', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

## Response Format

```json
{
  "success": true,
  "predictions": [
    {
      "x": 174.5,
      "y": 25,
      "width": 29,
      "height": 28,
      "confidence": 0.764,
      "class": "eryth",
      "class_id": 4,
      "detection_id": "29a42956-2d4c-47a6-8811-e58d0d569d9c"
    }
  ],
  "summary": {
    "total_detections": 5,
    "by_class": {
      "eryth": 2,
      "leuko": 3
    }
  }
}
```

## Health Check

```
GET https://mcggEz-urine-sediment.hf.space/health
```

Returns:
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

## Integration with Next.js

Your Next.js app already has the integration in `/api/detect-sediments/route.ts`. Just set the environment variable:

```env
HF_SPACE_URL=https://mcggEz-urine-sediment.hf.space/api/predict
```

## Real-Time Detection

For real-time webcam detection, use the page at `/yolo-realtime` in your Next.js app.

