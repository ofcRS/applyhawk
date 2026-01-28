# ApplyHawk - Chrome Extension

AI-powered Chrome extension for automating job applications with personalized resumes and cover letters.

## Tech Stack
- **Build:** esbuild + bun
- **Linting:** Biome
- **Language:** Vanilla JavaScript (ES Modules)
- **AI:** OpenRouter API (Claude, GPT-4o, Gemini, etc.)
- **PDF:** pdfjs-dist (text extraction), custom PDF generator (output)

## Commands
```bash
bun install          # Install dependencies
bun run build        # Build extension to dist/
bun run watch        # Build in watch mode
bun run lint         # Lint and fix with Biome
bun run format       # Format with Biome
```

## Loading in Chrome
1. `bun run build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. "Load unpacked" → select `dist/` folder

## Configuration
1. **OpenRouter API key** - https://openrouter.ai/keys (Side Panel → Platforms tab)
2. **AI Model** - Side Panel → Platforms tab (Top/All/Budget categories)
3. **Base resume** - Options page (manual entry or PDF import)
4. **Platform login** - Must be logged into HH.ru

## Project Structure
```
src/
├── background.js                 # Service worker entry point
├── core/                         # Shared modules
│   ├── ai/openrouter.js          # OpenRouter API client
│   ├── background/message-router.js  # Chrome message handling
│   ├── lib/
│   │   ├── pdf-generator.js      # PDF resume generation
│   │   ├── prompt-loader.js      # YAML prompt loading
│   │   └── storage.js            # Chrome storage wrapper
│   └── utils/network-interceptor.js  # Research mode API capture
├── platforms/
│   └── hh/                       # HH.ru platform
│       ├── api/hh-internal-api.js    # HH.ru internal API client
│       ├── content/
│       │   ├── injector.js       # Network interceptor injection
│       │   ├── vacancy-parser.js # Parse vacancy from DOM
│       │   └── vacancy-ui.js     # AI Apply button & modal
│       ├── handlers/hh-handlers.js   # Message handlers
│       └── styles/vacancy.css    # Content script styles
├── ui/
│   ├── panel/                    # Side panel (AI settings, research mode)
│   ├── options/                  # Settings page (resume editor)
│   └── shared/                   # Design tokens, components
├── prompts/                      # YAML prompt templates
│   ├── resume-personalization.yaml
│   ├── cover-letter.yaml
│   ├── fit-assessment.yaml
│   ├── pdf-parser.yaml
│   ├── resume-title.yaml
│   └── universal-vacancy-parse.yaml
└── fonts/                        # Noto Sans/Serif for PDF
```

Note: `src/background-scripts/`, `src/content-scripts/`, `src/lib/`, `src/options/`, `src/panel/` are legacy duplicates - the active code is in `src/core/` and `src/platforms/`.

## Supported Platforms
- **HH.ru** - Full support
- **LinkedIn** - Planned
- **Indeed** - Planned

## User Flow
```
Base resume (Options) → Open vacancy on HH.ru → Click "AI Отклик" button
    → AI personalizes resume → Updates resume on HH.ru
    → AI generates cover letter → Submits application
```

## Message Types

| Message | Description |
|---------|-------------|
| `CHECK_HH_AUTH` | Check HH.ru login status |
| `GET_USER_RESUMES` | Fetch user's resumes |
| `UPDATE_RESUME_EXPERIENCE` | Update resume experience |
| `UPDATE_RESUME_SKILLS` | Update resume skills |
| `APPLY_INTERNAL` | Submit application |
| `GENERATE_PERSONALIZED_RESUME` | AI resume rewrite |
| `GENERATE_COVER_LETTER` | AI cover letter |
| `PARSE_RESUME_PDF` | Parse PDF to structured data |

## Key Features

### AI Resume Personalization
- Rewrites experience descriptions to match job requirements
- Reorders/filters skills by relevance
- Generates professional resume title

### Cover Letter Generation
- Analyzes vacancy + resume
- Avoids clichés, uses specific achievements
- Russian language output for HH.ru

### PDF Import (Options)
- Upload PDF → pdfjs extracts text → AI parses into fields

### Research Mode (Side Panel)
- Captures all API requests for debugging
- Export as JSON
