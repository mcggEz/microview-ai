import gradio as gr
from ultralytics import YOLO
import json
import uuid
from PIL import Image
import numpy as np
import cv2
import os

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

# Class colors (BGR for OpenCV)
COLORS = {
    'cast': (0, 255, 0),      # Green
    'cryst': (255, 255, 0),  # Cyan
    'epith': (255, 0, 255),  # Magenta
    'epithn': (255, 0, 0),   # Blue
    'eryth': (0, 255, 255),  # Yellow
    'leuko': (0, 165, 255),  # Orange
    'mycete': (255, 0, 255), # Magenta
}

def detect_sediments(image, conf_threshold=0.25):
    """
    Detect urine sediments in image and return annotated image + JSON predictions
    
    Args:
        image: PIL Image
        conf_threshold: Confidence threshold (0.0-1.0)
    
    Returns:
        tuple: (annotated_image, json_string, summary_dict)
    """
    if image is None:
        return None, "Please upload an image", {}
    
    try:
        # Run inference
        results = model(image, conf=conf_threshold, verbose=False)
        
        # Convert PIL to numpy for drawing
        img_array = np.array(image)
        if len(img_array.shape) == 2:  # Grayscale
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        
        # Format predictions
        predictions = []
        annotated_img = img_array.copy()
        
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
                    
                    # Draw bounding box
                    color = COLORS.get(class_name, (255, 255, 255))
                    x1, y1 = int(x), int(y)
                    x2, y2 = int(x + width), int(y + height)
                    
                    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 2)
                    
                    # Draw label
                    label = f"{class_name} {confidence:.2f}"
                    (text_width, text_height), _ = cv2.getTextSize(
                        label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
                    )
                    cv2.rectangle(
                        annotated_img,
                        (x1, y1 - text_height - 10),
                        (x1 + text_width, y1),
                        color,
                        -1
                    )
                    cv2.putText(
                        annotated_img,
                        label,
                        (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (0, 0, 0),
                        1,
                        cv2.LINE_AA
                    )
                    
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
        
        # Convert back to PIL for Gradio
        annotated_pil = Image.fromarray(cv2.cvtColor(annotated_img, cv2.COLOR_BGR2RGB))
        
        # Create summary
        summary = {
            "total_detections": len(predictions),
            "by_class": {}
        }
        for pred in predictions:
            class_name = pred["class"]
            summary["by_class"][class_name] = summary["by_class"].get(class_name, 0) + 1
        
        result_json = {
            "success": True,
            "predictions": predictions,
            "summary": summary
        }
        
        json_str = json.dumps(result_json, indent=2)
        
        return annotated_pil, json_str, summary
    
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        import traceback
        traceback.print_exc()
        return None, error_msg, {}

# Create Gradio interface
with gr.Blocks(title="MicroView AI - Urine Sediment Detection") as demo:
    gr.Markdown("""
    # 🔬 MicroView AI - Urine Sediment Detection
    
    Upload a urine microscopy image to detect sediments using YOLO v11 model.
    
    **Detected Classes:**
    - `cast` - Urinary casts
    - `cryst` - Crystals
    - `epith` - Epithelial cells (normal)
    - `epithn` - Epithelial cells (abnormal)
    - `eryth` - Red blood cells
    - `leuko` - White blood cells
    - `mycete` - Yeast cells
    """)
    
    with gr.Row():
        with gr.Column():
            image_input = gr.Image(type="pil", label="Upload Image")
            conf_slider = gr.Slider(
                minimum=0.0,
                maximum=1.0,
                value=0.25,
                step=0.05,
                label="Confidence Threshold"
            )
            detect_btn = gr.Button("🔍 Detect Sediments", variant="primary", size="lg")
        
        with gr.Column():
            image_output = gr.Image(type="pil", label="Detected Sediments (with bounding boxes)")
            json_output = gr.Textbox(
                label="Predictions (JSON)",
                lines=15,
                max_lines=20,
                placeholder="JSON predictions will appear here..."
            )
    
    # Statistics
    stats_output = gr.JSON(label="📊 Summary Statistics")
    
    # Auto-detect on image upload or button click
    detect_btn.click(
        fn=detect_sediments,
        inputs=[image_input, conf_slider],
        outputs=[image_output, json_output, stats_output]
    )
    
    image_input.change(
        fn=detect_sediments,
        inputs=[image_input, conf_slider],
        outputs=[image_output, json_output, stats_output]
    )
    
    # Examples section
    gr.Markdown("### 💡 Tips")
    gr.Markdown("""
    - Upload a clear urine microscopy image
    - Adjust confidence threshold to filter detections (lower = more detections, higher = fewer but more confident)
    - Results include bounding boxes, class names, and confidence scores
    - JSON output can be used for API integration
    """)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)

