---
title: MicroView AI - Urine Sediment Detection
emoji: 🔬
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.0.0
app_file: app.py
pinned: false
license: mit
---

# 🔬 MicroView AI - Urine Sediment Detection

YOLO v11 model for detecting urine sediments in microscopic images.

## Model Information

- **Model**: YOLO11n (nano)
- **Classes**: 7 sediment types
  - `cast` - Urinary casts
  - `cryst` - Crystals
  - `epith` - Epithelial cells (normal)
  - `epithn` - Epithelial cells (abnormal)
  - `eryth` - Red blood cells (erythrocytes)
  - `leuko` - White blood cells (leukocytes)
  - `mycete` - Yeast cells

## Usage

1. Upload a urine microscopy image
2. Adjust confidence threshold (default: 0.25)
3. View detected sediments with bounding boxes
4. Get JSON predictions for API integration

## API Endpoint

This Space provides an API endpoint for programmatic access:

```
POST https://[your-space].hf.space/api/predict
```

**Request:**
```json
{
  "data": [
    "data:image/jpeg;base64,...",  // Base64 encoded image
    0.25                             // Confidence threshold
  ]
}
```

**Response:**
```json
{
  "data": [
    "<annotated_image>",  // Annotated image (PIL)
    "{...json...}",       // JSON predictions string
    {...}                 // Summary statistics
  ]
}
```

## Integration with Next.js

See the main repository for Next.js integration code.

## Model Performance

- **Training Dataset**: 5,278 images
- **Validation mAP50**: ~0.58
- **Model Size**: ~5-10MB

