## Microview AI – Urinalysis Image Processing (Next.js + Supabase)

A SaaS-style web app for medical tech labs to manage urine tests and review AI-assisted microscopic examination results.

### Tech Stack
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS for UI
- Supabase (Postgres, Auth, Storage)
- Lucide React icons

### Local Setup
1) Install dependencies
```bash
npm install
```

2) Environment variables
- Create a local `.env.local` with your credentials:
```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API (for AI image analysis)
GEMINI_API_KEY=your_gemini_api_key
```
Note: Env files are ignored by git (see `.gitignore`). Do not commit secrets.

3) Run the dev server
   ```bash
npm run dev
   ```
Open http://localhost:3000

### Supabase: Database and Migrations
- Requires the Supabase CLI. Install from docs.
- Login and link your project, then push migrations:
   ```bash
npx supabase login
npx supabase link
npx supabase db push
```
Schema overview:
- `patients`: demographic info (patient_id, name, age, gender)
- `urine_tests`: one row per test (microscopic results, image_1..4_url/description, dates)

### App Structure
- `src/app/page.tsx`: Marketing/landing page
- `src/app/report/page.tsx`: Main report page with test management and analysis
- `src/app/report/page.tsx`: Detailed report with patient sidebar, tests, images, edit and upload/capture buttons
- `src/hooks/useDashboard.ts`: Data fetching and state for patients/tests
- `src/lib/api.ts`: CRUD helpers for Supabase
- `src/lib/supabase.ts`: Supabase client

### Key Features
- Calendar view to navigate tests by date
- Patient sidebar with Add New Patient modal
- Test-centric data model, recent history per patient
- Microscopic images with enlarge modal, upload/capture placeholders
- **AI-powered image analysis using Google Gemini API**
- Inline edit mode for patient and test metadata

### Scripts
```bash
npm run dev       # start local dev
npm run build     # production build
npm run start     # start production server
```

### AI Image Analysis
- Uses Google Gemini Pro Vision model for urinalysis microscopy analysis
- Analyzes uploaded/captured images and provides detailed findings
- Returns structured data with counts, morphology, clinical status, and confidence levels
- Results can be integrated with test records

### Image Upload (Next Steps)
- Buttons for Upload/Capture are wired; integrate Supabase Storage to upload files and update `urine_tests.image_n_url` fields.

### Deployment
- Any Node host (Vercel recommended). Set env vars in host config.

### License
Proprietary (internal project). Update as needed.