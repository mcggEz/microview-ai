# Deployment Guide for Hugging Face Space

## Quick Start

1. **Upload Model File**
   - Go to your Space: https://huggingface.co/spaces/mcggEz/urine-sediment
   - Click "Files" → "Add file" → "Upload file"
   - Upload `best.pt` from: `urine-sediments-yolov11/runs/detect/urine_sediment_v1/weights/best.pt`
   - Save it as `best.pt` in the root directory

2. **Push Files to Space**
   ```bash
   cd urine-sediment
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://huggingface.co/spaces/mcggEz/urine-sediment
   git push -u origin main
   ```

   OR use the web UI to upload files directly.

3. **Configure Space**
   - Go to Settings
   - Hardware: **GPU T4 small**
   - SDK: **Gradio**
   - Visibility: Your choice

4. **Wait for Build**
   - Space will build automatically (2-5 minutes)
   - Check logs if there are errors

5. **Test Your Space**
   - Visit: https://huggingface.co/spaces/mcggEz/urine-sediment
   - Upload a test image
   - Verify detections work

## API Integration

Once deployed, your Space API URL will be:
```
https://mcggEz-urine-sediment.hf.space/api/predict
```

Add to your Next.js `.env.local`:
```env
HF_SPACE_URL=https://mcggEz-urine-sediment.hf.space/api/predict
```

## Testing Locally

You can test the Space code locally:

```bash
cd urine-sediment
pip install -r requirements.txt
python app.py
```

Then visit: http://localhost:7860

## Troubleshooting

### Model Not Found
- Ensure `best.pt` is in root directory
- Check file name is exactly `best.pt`
- Verify file uploaded successfully

### Build Errors
- Check `requirements.txt` versions
- Verify Python compatibility
- Check Space logs for details

### API Not Working
- Ensure Space is running (not sleeping)
- Check API endpoint URL
- Verify request format

