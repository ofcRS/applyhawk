# Chrome Web Store — Permission Justifications

## Required Permissions

### `storage`
**Purpose:** Save user's resume, settings (AI model, personalization level), and API key locally in Chrome's extension storage. No data leaves the device.

### `activeTab`
**Purpose:** Read the content of the currently active tab when the user clicks the ApplyHawk button, to detect and parse job descriptions on supported job boards.

### `tabs`
**Purpose:** Open the side panel when the user clicks the ApplyHawk toolbar icon, and to detect when the user navigates to a supported job page.

### `scripting`
**Purpose:** Inject the ApplyHawk button UI onto supported job pages (LinkedIn, Indeed, Glassdoor, etc.) so the user can trigger resume generation with one click.

### `sidePanel`
**Purpose:** Display the ApplyHawk side panel interface where users can view fit assessments, generate personalized resumes, and manage cover letters.

### `cookies`
**Purpose:** Check HH.ru authentication status to enable the direct auto-apply feature. Only reads cookies for hh.ru domain — no other cookies are accessed.

## Host Permissions

### `https://hh.ru/*`, `https://*.hh.ru/*`, `https://api.hh.ru/*`
**Purpose:** Full HH.ru integration — detect vacancy pages, parse job descriptions, check auth status, and submit applications via HH.ru's API on behalf of the user.

### `https://openrouter.ai/*`
**Purpose:** Send AI requests (resume personalization, cover letter generation, fit assessment) to OpenRouter API using the user's own API key.

### `https://linkedin.com/*`, `https://*.linkedin.com/*`
**Purpose:** Detect job postings on LinkedIn and inject the ApplyHawk button for one-click resume generation.

### `https://indeed.com/*`, `https://*.indeed.com/*`
**Purpose:** Detect job postings on Indeed and inject the ApplyHawk button.

### `https://glassdoor.com/*`, `https://*.glassdoor.com/*`
**Purpose:** Detect job listings on Glassdoor and inject the ApplyHawk button.

### `https://greenhouse.io/*`, `https://*.greenhouse.io/*`
**Purpose:** Detect job postings on Greenhouse ATS pages and inject the ApplyHawk button.

### `https://lever.co/*`, `https://*.lever.co/*`
**Purpose:** Detect job postings on Lever ATS pages and inject the ApplyHawk button.

### `https://*.myworkdayjobs.com/*`, `https://*.workday.com/*`
**Purpose:** Detect job postings on Workday ATS pages and inject the ApplyHawk button.

### `https://*.icims.com/*`
**Purpose:** Detect job postings on iCIMS ATS pages and inject the ApplyHawk button.

### `https://*.ashbyhq.com/*`
**Purpose:** Detect job postings on Ashby ATS pages and inject the ApplyHawk button.

### `https://*.smartrecruiters.com/*`
**Purpose:** Detect job postings on SmartRecruiters ATS pages and inject the ApplyHawk button.

## Optional Host Permissions

### `<all_urls>`
**Purpose:** Allow users to use ApplyHawk on job boards not in the default list. This permission is never requested automatically — it is only prompted when the user explicitly wants to use ApplyHawk on an unsupported site. The extension works fully without this permission on all pre-configured platforms listed above.

## Single Purpose Statement

ApplyHawk has a single purpose: to help job seekers personalize their resumes and cover letters for specific job postings using AI. All permissions are used exclusively for detecting job pages, parsing job descriptions, and generating personalized application materials.
