# ApplyHawk - AI Job Application Platform

AI-powered job application automation with personalized resumes and cover letters.

## Architecture

**Monorepo Structure:**
```
applyhawk/
├── packages/
│   ├── core/              # @applyhawk/core - Shared TypeScript logic
│   │   ├── src/ai/        # OpenRouter AI client
│   │   ├── src/pdf/       # PDF resume generator
│   │   ├── src/storage/   # Storage adapters (web/extension)
│   │   ├── src/prompts/   # Prompt loader + i18n
│   │   └── src/types/     # Shared TypeScript types
│   │
│   ├── web/               # @applyhawk/web - React website (applyhawk.top)
│   │   ├── src/pages/     # Landing, AppPage
│   │   ├── src/components/# ResumeEditor, JobInput, ResultViewer
│   │   ├── src/hooks/     # useAI, useStorage
│   │   └── public/prompts/# YAML prompt templates
│   │
│   └── extension/         # @applyhawk/extension - Chrome extension
│       ├── src/platforms/hh/       # HH.ru optimized integration
│       ├── src/platforms/universal/# Universal job page detection
│       └── src/ui/                 # Side panel, options page
```

## Tech Stack
- **Build:** esbuild (extension), Vite (web)
- **Monorepo:** bun workspaces
- **Linting:** Biome
- **Language:** TypeScript (core, web), JavaScript (extension)
- **Web Framework:** React + Vite
- **AI:** OpenRouter API
- **PDF:** pdf-lib + fontkit

## Commands
```bash
# Install all dependencies
bun install

# Build everything
bun run build

# Build individual packages
bun run build:core       # Typecheck core package
bun run build:extension  # Build Chrome extension to packages/extension/dist/
bun run build:web        # Build website to packages/web/dist/

# Development
bun run dev:web          # Run web dev server
bun run watch:extension  # Watch mode for extension

# Lint & format
bun run lint
bun run format
```

## Loading Extension in Chrome
1. `bun run build:extension`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. "Load unpacked" → select `packages/extension/dist/`

## Key Features

### Core Package (@applyhawk/core)
- **AI Client:** Injectable OpenRouter client, works with web localStorage or Chrome storage
- **Storage Adapters:** `createWebStorage()` for web, `createExtensionStorage()` for extension
- **PDF Generator:** Configurable font URLs, Cyrillic support
- **Prompt Loader:** Multi-language (en/ru) with auto-detection
- **Types:** Shared TypeScript interfaces for Resume, Vacancy, Settings

### Web App (@applyhawk/web)
- Landing page with value props
- Resume editor with dynamic experience/education sections
- Job description input with language detection
- PDF download of personalized resume
- Privacy-first: all data in localStorage

### Extension (@applyhawk/extension)
- **HH.ru:** Full integration with direct API updates
- **Universal:** Job page detection on LinkedIn, Indeed, Glassdoor, Greenhouse, Lever
- Side panel for settings and research mode
- Options page for base resume configuration

## User Flow

**Web:**
```
Landing → Enter resume → Paste job → AI generates → Download PDF
```

**Extension:**
```
Open job page → Click "ApplyHawk" button → Side panel opens → AI generates → Apply
```

## Supported Platforms

| Platform | Status | Integration |
|----------|--------|-------------|
| HH.ru | Full | Direct API, auto-apply |
| LinkedIn | Detection | Button injection, manual apply |
| Indeed | Detection | Button injection, manual apply |
| Glassdoor | Detection | Button injection, manual apply |
| Greenhouse | Detection | Button injection, manual apply |
| Lever | Detection | Button injection, manual apply |

## Configuration Required
1. **OpenRouter API key** - Get at https://openrouter.ai/keys
2. **Base resume** - Fill in Options page (extension) or web app
3. **Platform login** - Must be logged into job sites for API features (HH.ru)

## Message Types (Extension)

| Message | Description |
|---------|-------------|
| `UNIVERSAL_JOB_DETECTED` | Job page detected on any supported site |
| `CHECK_HH_AUTH` | Check HH.ru login status |
| `GET_USER_RESUMES` | Fetch user's resumes |
| `UPDATE_RESUME_EXPERIENCE` | Update resume experience |
| `UPDATE_RESUME_SKILLS` | Update resume skills |
| `APPLY_INTERNAL` | Submit application |
| `GENERATE_PERSONALIZED_RESUME` | AI resume rewrite |
| `GENERATE_COVER_LETTER` | AI cover letter |
| `PARSE_RESUME_PDF` | Parse PDF to structured data |
| `OPEN_SIDE_PANEL` | Open extension side panel |

## Prompt Templates

Located in `packages/core/src/prompts/templates/{en,ru}/`:
- `resume-personalization.yaml` - Rewrites experience for job match
- `cover-letter.yaml` - Generates professional cover letters
- `fit-assessment.yaml` - Calculates fit score
- `pdf-parser.yaml` - Parses PDF resume text
- `universal-vacancy-parse.yaml` - Parses job descriptions
- `resume-title.yaml` - Generates resume titles

Language is auto-detected from job description (Cyrillic ratio check).
