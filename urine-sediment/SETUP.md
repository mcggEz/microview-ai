# Hugging Face Space Setup Instructions

## Step 1: Upload Model File

1. Go to your Hugging Face Space: https://huggingface.co/spaces/mcggEz/urine-sediment
2. Click the **"Files"** tab
3. Click **"Add file"** → **"Upload file"**
4. Upload your `best.pt` model file:
   - **Source**: `urine-sediments-yolov11/runs/detect/urine_sediment_v1/weights/best.pt`
   - **Destination**: Root directory of the Space (same level as `app.py`)
   - **File name**: `best.pt`

## Step 2: Configure Space Settings

1. Go to **Settings** in your Space
2. Set **Hardware**: `GPU T4 small` (free tier)
3. Set **Visibility**: Public or Private (your choice)
4. Set **SDK**: `Gradio`

## Step 3: Deploy

The Space will automatically build and deploy when you:
- Push files via Git, OR
- Upload files via the web UI

Wait 2-5 minutes for the build to complete.

## Step 4: Test

1. Visit your Space: https://huggingface.co/spaces/mcggEz/urine-sediment
2. Upload a test image
3. Verify detections work correctly

## Step 5: Get API URL

Your Space API endpoint will be:
```
https://mcggEz-urine-sediment.hf.space/api/predict
```

Use this URL in your Next.js app's `.env.local`:
```env
HF_SPACE_URL=https://mcggEz-urine-sediment.hf.space/api/predict
```

## Troubleshooting

### Model Not Found Error
- Make sure `best.pt` is in the root directory
- Check file name is exactly `best.pt` (case-sensitive)
- Wait for Space to finish building

### Build Fails
- Check `requirements.txt` is correct
- Verify Python version compatibility
- Check Space logs for specific errors

### API Not Working
- Ensure Space is running (not sleeping)
- Check API endpoint URL is correct
- Verify request format matches Gradio API

