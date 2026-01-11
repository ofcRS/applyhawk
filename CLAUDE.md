# HH Job AutoApply - Chrome Extension

## Project Overview
Chrome Extension (Manifest V3) for automating HH.ru job applications with AI-generated personalized resumes and cover letters.

## Current Status: Ready for Testing

The extension bypasses the shut-down official HH.ru API by using internal API endpoints discovered via network interception.

### Full User Flow
```
User has master resume in extension settings (via PDF import or manual entry)
       ↓
Opens job listing on HH.ru
       ↓
Clicks "AI Отклик" button
       ↓
Extension parses job requirements from DOM
       ↓
AI fully rewrites resume tailored to this job
       ↓
Extension updates resume on HH.ru (internal API)
       ↓
AI generates cover letter
       ↓
Extension submits application (internal API)
```

## Tech Stack
- **Build:** esbuild + bun
- **Linting:** Biome
- **Language:** Vanilla JavaScript (ES Modules)
- **AI:** OpenRouter API (Claude, GPT-4o, Gemini, etc.)
- **PDF:** pdfjs-dist (for PDF text extraction)

## Commands
```bash
bun install          # Install dependencies
bun run build        # Build extension to dist/
bun run watch        # Build in watch mode
bun run lint         # Lint and fix with Biome
bun run format       # Format with Biome
```

## Project Structure
```
src/
├── background-scripts/
│   ├── background.js       # Message routing hub
│   ├── hh-internal-api.js  # HH.ru internal API client (resume update, apply)
│   ├── openrouter.js       # AI: cover letters, resume personalization, PDF parsing
│   ├── oauth.js            # HH.ru OAuth (legacy, API shut down)
│   └── hh-api.js           # HH.ru official API (broken, kept for reference)
├── content-scripts/
│   ├── hh-vacancy.js       # Main UI: 4-step apply flow modal
│   ├── hh-vacancy.css      # Modal and button styles
│   ├── hh-injector.js      # Injects network interceptor
│   └── network-interceptor.js  # Captures HH.ru API calls (research mode)
├── panel/
│   ├── panel.html/js/css   # Side panel: auth, model selector, research mode
├── options/
│   ├── options.html/js/css # Settings: API key, resume editor, PDF import
├── lib/
│   └── storage.js          # Chrome storage wrapper
└── utils/
    └── vacancy-parser.js   # Parse vacancy from DOM
```

## Loading Extension in Chrome
1. Run `bun run build`
2. Open chrome://extensions
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/` folder

## Configuration Required
1. **OpenRouter API key** - Get from https://openrouter.ai/keys
2. **Base resume** - Fill manually or import from PDF in Options page
3. **HH.ru login** - Must be logged into hh.ru (uses session cookies)

## HH.ru Internal API (Discovered)

### Resume Update
```
POST https://resume-profile-front.hh.ru/profile/shards/resume/update
Headers: X-Xsrftoken, X-Requested-With: XMLHttpRequest
Body: { resumeHash, currentScreenId: "experience"|"keyskills", resume: {...} }
```

### Apply to Vacancy
```
POST https://hh.ru/applicant/vacancy_response/popup
Headers: X-Xsrftoken, X-Requested-With: XMLHttpRequest
Body: { vacancy_id, resume_hash, letter, _xsrf, ... }
```

### XSRF Token
Extracted from `_xsrf` cookie on hh.ru domain.

## Key Features

### 1. PDF Resume Import (Options Page)
- Upload PDF → pdfjs-dist extracts text → AI parses into structured format
- Auto-fills all form fields

### 2. AI Resume Personalization
- Takes base resume + vacancy requirements
- Rewrites experience descriptions to match job
- Reorders/filters skills by relevance
- Output matches HH.ru's expected format

### 3. AI Cover Letter Generation
- Analyzes vacancy and resume
- Generates personalized cover letter in Russian
- Avoids clichés, includes specific achievements

### 4. Research Mode (Side Panel)
- Toggle to capture all HH.ru API calls
- Export captured requests as JSON
- Used for discovering new endpoints

## Message Types (Background Script)

| Message | Handler |
|---------|---------|
| `CHECK_HH_AUTH` | Check if user is logged into HH.ru |
| `GET_USER_RESUMES` | Fetch user's resumes from HH.ru |
| `UPDATE_RESUME_EXPERIENCE` | Update resume experience section |
| `UPDATE_RESUME_SKILLS` | Update resume skills section |
| `APPLY_INTERNAL` | Submit job application |
| `GENERATE_PERSONALIZED_RESUME` | AI: rewrite resume for vacancy |
| `GENERATE_COVER_LETTER` | AI: generate cover letter |
| `PARSE_RESUME_PDF` | AI: parse PDF text into resume format |
| `GET_SETTINGS` / `GET_BASE_RESUME` | Read from storage |

## 4-Step Apply Flow (hh-vacancy.js)

1. **Select Resume** - Choose which HH.ru resume to personalize
2. **Generate Personalized Resume** - AI rewrites experience/skills for this job
3. **Update on HH.ru** - Push changes to the actual resume
4. **Generate Cover Letter & Apply** - Create letter and submit application

## Historical Context

### HH.ru API Shutdown (December 15, 2024)
The official job seeker API was shut down. This extension now uses internal APIs discovered via network interception (Research Mode).

### OAuth (Legacy)
OAuth flow still works for obtaining tokens, but all API endpoints return 403 Forbidden.
- Client ID: `Q98DOG1S30C16RKMGPS9879R8MQVC78P5F0A80LH95VOTUQDLLDNMDM80C8DF8LQ`
- Redirect URI: `chrome-extension://<extension-id>/oauth-callback.html`

## Testing Checklist
- [ ] PDF import works in Options
- [ ] Base resume saves correctly
- [ ] "AI Отклик" button appears on vacancy pages
- [ ] Resume personalization generates valid output
- [ ] Resume updates on HH.ru (verify on resume page)
- [ ] Cover letter generates
- [ ] Application submits (check "Отклики" on HH.ru)
