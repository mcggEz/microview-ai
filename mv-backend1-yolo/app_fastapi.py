"""
FastAPI-only backend for Urine Sediment Detection
No UI - Pure API endpoint
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import json
import uuid
from PIL import Image
import numpy as np
import cv2
import os
import io

# Load model
MODEL_PATH = 'best.pt'
if os.path.exists(MODEL_PATH):
    model = YOLO(MODEL_PATH)
    print(f"✅ Model loaded successfully from {MODEL_PATH}")
    print(f"📊 Model classes: {list(model.names.values())}")
else:
    raise FileNotFoundError(
        f"❌ Model not found at {MODEL_PATH}\n"
        "Please upload your best.pt file to the Space root directory."
    )

# Initialize FastAPI app
app = FastAPI(title="Urine Sediment Detection API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "message": "Urine Sediment Detection API",
        "model": "YOLO v11",
        "classes": list(model.names.values())
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": True}

@app.post("/api/predict")
async def detect_sediments(
    image: UploadFile = File(...),
    conf: float = Form(0.25)
):
    """
    Detect urine sediments in uploaded image
    
    Args:
        image: Image file (JPEG, PNG, etc.)
        conf: Confidence threshold (0.0-1.0), default 0.25
    
    Returns:
        JSON with predictions in the specified format
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image
        image_bytes = await image.read()
        image_pil = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image_pil.mode != 'RGB':
            image_pil = image_pil.convert('RGB')
        
        # Run inference
        results = model(image_pil, conf=conf, verbose=False)
        
        # Format predictions
        predictions = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x_center, y_center, width, height = box.xywh[0].cpu().numpy()
                    x = float(x_center - width / 2)
                    y = float(y_center - height / 2)
                    
                    class_id = int(box.cls[0].cpu().numpy())
                    confidence = float(box.conf[0].cpu().numpy())
                    class_name = model.names[class_id]
                    
                    predictions.append({
                        "x": x,
                        "y": y,
                        "width": float(width),
                        "height": float(height),
                        "confidence": round(confidence, 3),
                        "class": class_name,
                        "class_id": class_id,
                        "detection_id": str(uuid.uuid4())
                    })
        
        # Create summary
        summary = {
            "total_detections": len(predictions),
            "by_class": {}
        }
        for pred in predictions:
            class_name = pred["class"]
            summary["by_class"][class_name] = summary["by_class"].get(class_name, 0) + 1
        
        return JSONResponse({
            "success": True,
            "predictions": predictions,
            "summary": summary
        })
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)

