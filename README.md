# HH AutoApply

AI-powered Chrome extension for automating job applications on HH.ru (HeadHunter) with personalized resumes and cover letters.

<img width="720"  alt="image" src="https://github.com/user-attachments/assets/f8b2358b-2cc9-4d14-8ad2-a8186334e277" />
<img width="720" alt="image" src="https://github.com/user-attachments/assets/18695e9e-b8e2-4ef0-a00a-1e4cef9fe587" />


![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-00C853)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- **AI Resume Personalization** - Automatically rewrites your resume to match each job's requirements
- **Smart Cover Letters** - Generates personalized cover letters in Russian using AI
- **PDF Import** - Import your existing resume from PDF and auto-fill all fields
- **Fit Score Analysis** - See how well your profile matches each vacancy
- **One-Click Apply** - Streamlined 4-step application flow
- **Research Mode** - Capture and analyze HH.ru API calls for debugging

## How It Works

```
Your Base Resume → AI Analyzes Job Requirements → Personalized Resume + Cover Letter → Auto-Submit
```

1. **Set up your base resume** - Either import from PDF or fill manually in settings
2. **Browse vacancies on HH.ru** - Find jobs you're interested in
3. **Click "AI Отклик"** - Our button appears next to every vacancy
4. **Review & Submit** - AI personalizes your resume, generates a cover letter, and submits

## Installation

### Prerequisites
- [Bun](https://bun.sh) (package manager)
- Chrome browser
- [OpenRouter API key](https://openrouter.ai/keys)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/hh-autoapply.git
cd hh-autoapply

# Install dependencies
bun install

# Build the extension
bun run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

## Configuration

1. **OpenRouter API Key** - Get one from [openrouter.ai/keys](https://openrouter.ai/keys)
2. **Your Resume** - Fill in the settings page or import from PDF
3. **HH.ru Login** - Make sure you're logged into hh.ru

## Tech Stack

| Category | Technology |
|----------|------------|
| Build | esbuild + Bun |
| Language | Vanilla JavaScript (ES Modules) |
| AI Provider | OpenRouter (Claude, GPT-4o, Gemini) |
| PDF Parsing | pdfjs-dist |
| Linting | Biome |

## Project Structure

```
src/
├── background-scripts/     # Service worker & API handlers
│   ├── background.js       # Message routing hub
│   ├── hh-internal-api.js  # HH.ru API client
│   └── openrouter.js       # AI integration
├── content-scripts/        # Injected into HH.ru pages
│   ├── hh-vacancy.js       # Main UI & apply flow
│   └── hh-vacancy.css      # Modal styles
├── panel/                  # Extension side panel
├── options/                # Settings page
├── lib/                    # Shared utilities
└── utils/                  # Helper functions
```

## Scripts

```bash
bun run build    # Build to dist/
bun run watch    # Build with hot reload
bun run lint     # Lint & fix with Biome
bun run format   # Format code
```

## AI Models

The extension uses OpenRouter to access various AI models. Recommended models:

| Model | Best For | Cost |
|-------|----------|------|
| Claude Sonnet 4 | Highest quality | $$$ |
| GPT-4o | Good balance | $$ |
| Gemini Pro 1.5 | Cost-effective | $ |

## Privacy & Security

- Your API key is stored locally in Chrome storage
- Resume data never leaves your browser except for AI processing
- No analytics or tracking
- All communication with HH.ru uses your existing session cookies

## Disclaimer

This extension is for educational purposes. Use responsibly and in accordance with HH.ru's terms of service. The developers are not responsible for any consequences of using this tool.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Made with AI assistance for the Russian job market
