# Gemini API Setup for Raspberry Pi

This guide shows how to configure Google Gemini API for AI-powered urine microscopy analysis on your Raspberry Pi.

## 🔑 **Getting Your Gemini API Key**

### **1. Create Google AI Studio Account**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIza...`)

### **2. Set Up Environment Variables**

On your Raspberry Pi, create/edit `.env.local`:
```bash
# Navigate to your project directory
cd /home/pi/microview-ai

# Edit environment file
nano .env.local
```

Add your Gemini API key:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyCkAC0Bf-v47G3rEqnjL46a79q-OefLcQ4

# Raspberry Pi Configuration
RASPBERRY_PI_MODE=true
MOTOR_ENABLED=true
```

## 🤖 **How Gemini API Works**

### **API Flow**
```
1. Med Tech captures/uploads image
   ↓
2. Image sent to Raspberry Pi Next.js server
   ↓
3. Next.js makes API call to Google Gemini
   ↓
4. Gemini analyzes image and returns results
   ↓
5. Results displayed in dashboard
```

### **API Endpoint**
- **URL**: `http://raspberry-pi-ip:3000/api/analyze-image`
- **Method**: POST
- **Content**: FormData with image file

## 📊 **What Gemini Analyzes**

### **Microscopic Elements**
- **RBC (Red Blood Cells)**: Count, morphology, clinical significance
- **WBC (White Blood Cells)**: Count, morphology, infection indicators
- **Epithelial Cells**: Type and quantity
- **Crystals**: Type, size, clinical relevance
- **Casts**: Type and significance
- **Bacteria**: Presence and type
- **Yeast**: Fungal elements
- **Mucus**: Mucous threads
- **Sperm**: Spermatozoa presence
- **Parasites**: Parasitic organisms

### **Analysis Output**
```json
{
  "rbc": {
    "count": "0-2",
    "unit": "/HPF",
    "morphology": "Normal",
    "notes": "No significant findings",
    "status": "normal"
  },
  "overall_accuracy": 95,
  "summary": "Normal urinalysis findings"
}
```

## 🧪 **Testing the API**

### **1. Test from Browser**
```bash
# On Raspberry Pi
curl -X POST http://localhost:3000/api/analyze-image \
  -F "image=@/path/to/test-image.jpg"
```

### **2. Test from Web Interface**
1. Open `http://raspberry-pi-ip:3000` on any device
2. Navigate to a test report
3. Click "Analyze Image" button
4. Upload or capture an image
5. View AI analysis results

### **3. Test API Response**
```bash
# Expected successful response
{
  "success": true,
  "analysis": {
    "rbc": { ... },
    "wbc": { ... },
    "overall_accuracy": 95,
    "summary": "..."
  },
  "timestamp": "2025-01-XX..."
}
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. API Key Not Found**
```bash
# Error: Gemini API key not configured properly
# Solution: Check .env.local file
cat .env.local | grep GEMINI_API_KEY
```

#### **2. Quota Exceeded**
```bash
# Error: Gemini API quota exceeded
# Solution: Check usage in Google AI Studio
# Free tier: 15 requests/minute, 1500 requests/day
```

#### **3. Invalid Image Format**
```bash
# Error: Invalid image format or corrupted file
# Solution: Ensure image is JPEG, PNG, or WebP
# Maximum size: 10MB
```

#### **4. Network Issues**
```bash
# Error: Failed to analyze image
# Solution: Check internet connection
ping google.com
```

### **Debug Commands**
```bash
# Check if API key is loaded
echo $GEMINI_API_KEY

# Test internet connectivity
curl -I https://generativelanguage.googleapis.com

# Check Next.js logs
pm2 logs microview-ai

# Monitor API calls
tail -f /home/pi/microview-ai/.next/server.log
```

## 💰 **Cost Management**

### **Free Tier Limits**
- **Requests per minute**: 15
- **Requests per day**: 1,500
- **Image size**: Up to 10MB

### **Pricing (Beyond Free Tier)**
- **Input tokens**: $0.00025 / 1K tokens
- **Output tokens**: $0.0005 / 1K tokens
- **Images**: $0.0025 per image

### **Monitor Usage**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click on your API key
3. View usage statistics
4. Set up billing alerts

## 🔒 **Security Considerations**

### **API Key Protection**
```bash
# Never commit API key to git
echo ".env.local" >> .gitignore

# Set proper file permissions
chmod 600 .env.local

# Use environment variables in production
export GEMINI_API_KEY="your_key_here"
```

### **Network Security**
```bash
# Only allow local network access
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Block external access
sudo ufw deny 3000
```

## 📈 **Performance Optimization**

### **Image Optimization**
- **Compress images** before upload (max 10MB)
- **Use JPEG** for photos, PNG for screenshots
- **Resize large images** to reasonable dimensions

### **Caching**
- **Cache analysis results** in database
- **Avoid re-analyzing** same images
- **Store results** with image URLs

### **Error Handling**
- **Retry failed requests** with exponential backoff
- **Show user-friendly** error messages
- **Log errors** for debugging

## 🚀 **Production Deployment**

### **Environment Setup**
```bash
# Production environment variables
NODE_ENV=production
GEMINI_API_KEY=your_production_key
GEMINI_API_URL=https://generativelanguage.googleapis.com
```

### **Monitoring**
```bash
# Monitor API usage
pm2 monit

# Check error logs
pm2 logs microview-ai --err

# Monitor system resources
htop
```

### **Backup Strategy**
- **Backup API keys** securely
- **Monitor quota usage** daily
- **Have fallback** analysis methods

## ✅ **Verification Checklist**

- [ ] Gemini API key obtained and configured
- [ ] Environment variables set correctly
- [ ] API endpoint accessible (`/api/analyze-image`)
- [ ] Image upload working
- [ ] Analysis results displayed
- [ ] Error handling working
- [ ] Usage monitoring set up
- [ ] Security measures implemented

## 🎯 **Next Steps**

1. **Test with real images** from your lab
2. **Fine-tune prompts** for better accuracy
3. **Implement result caching**
4. **Add batch processing** for multiple images
5. **Set up usage alerts**
6. **Document analysis patterns**

Your Raspberry Pi is now ready to provide AI-powered urine microscopy analysis! 🧬🔬
