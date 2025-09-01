# Environment Variables Setup Guide

## 🔑 Fix "No API key found in request" Error

The error occurs because your Supabase API credentials are not configured. Follow these steps to fix it:

### 1. Create Environment File

Create a `.env.local` file in your project root directory:

```bash
# In your project root directory
touch .env.local
```

### 2. Add Your Supabase Credentials

Add the following to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini API (for AI image analysis)
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Get Your Supabase Credentials

#### Step 1: Go to Your Supabase Project
1. Visit [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

#### Step 2: Find Your Credentials
1. **Go to Settings** → **API**
2. **Copy the following:**
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Example:
```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjU2NzI5MCwiZXhwIjoxOTUyMTQzMjkwfQ.example
```

### 4. Restart Your Development Server

After creating the `.env.local` file:

```bash
# Stop your current server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

### 5. Verify Configuration

Check that your environment variables are loaded:

1. **Open browser console** (F12)
2. **Look for any Supabase connection errors**
3. **Test the application** - try uploading an image

### 6. Troubleshooting

#### Common Issues:

1. **"Missing environment variable" error**
   - Ensure `.env.local` is in the project root
   - Check for typos in variable names
   - Restart the development server

2. **"Invalid API key" error**
   - Verify you copied the correct key
   - Ensure the key starts with `eyJ`
   - Check that the URL is correct

3. **"Project not found" error**
   - Verify your project URL is correct
   - Check that your project is active in Supabase

4. **File not found errors**
   - Ensure `.env.local` is not in `.gitignore`
   - Check file permissions

### 7. Security Notes

- ✅ `.env.local` is automatically ignored by Git
- ✅ Never commit your API keys to version control
- ✅ Use different keys for development and production
- ✅ Rotate keys regularly for security

### 8. Production Deployment

For production deployment, set these environment variables in your hosting platform:

- **Vercel**: Add in Project Settings → Environment Variables
- **Netlify**: Add in Site Settings → Environment Variables
- **Railway**: Add in Project Settings → Variables

### 9. Test Your Setup

After configuring the environment variables:

1. **Visit your application**
2. **Try creating a new test**
3. **Upload an image**
4. **Check that images are stored in Supabase Storage**

### 10. Complete Example

Your `.env.local` should look like this:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjU2NzI5MCwiZXhwIjoxOTUyMTQzMjkwfQ.example

# Google Gemini API (optional - for AI analysis)
GEMINI_API_KEY=AIzaSyC-example-key-here
```

## 🎯 Next Steps

1. **Create the `.env.local` file** with your credentials
2. **Restart your development server**
3. **Test image upload functionality**
4. **Verify no more API key errors**

If you still have issues, check the browser console for specific error messages and ensure your Supabase project is properly configured.
