/**
 * Universal Job Page Detector
 * Detects job postings on any website using multiple strategies:
 * 1. Known job site URL patterns
 * 2. JSON-LD schema.org/JobPosting structured data
 * 3. Heuristic detection (Apply buttons, job keywords)
 */

// Known job site URL patterns
const JOB_SITE_PATTERNS = [
  // HH.ru (already has dedicated support)
  { pattern: /hh\.ru\/vacancy\//, platform: 'hh', confidence: 1.0 },

  // LinkedIn
  { pattern: /linkedin\.com\/jobs\/view\//, platform: 'linkedin', confidence: 1.0 },
  { pattern: /linkedin\.com\/jobs\/collections\//, platform: 'linkedin', confidence: 0.8 },

  // Indeed
  { pattern: /indeed\.com\/viewjob/, platform: 'indeed', confidence: 1.0 },
  { pattern: /indeed\.com\/jobs/, platform: 'indeed', confidence: 0.8 },
  { pattern: /indeed\.[a-z]+\/viewjob/, platform: 'indeed', confidence: 1.0 },

  // Glassdoor
  { pattern: /glassdoor\.com\/job-listing\//, platform: 'glassdoor', confidence: 1.0 },
  { pattern: /glassdoor\.[a-z]+\/job-listing\//, platform: 'glassdoor', confidence: 1.0 },

  // Monster
  { pattern: /monster\.com\/job-openings\//, platform: 'monster', confidence: 1.0 },

  // ZipRecruiter
  { pattern: /ziprecruiter\.com\/jobs\//, platform: 'ziprecruiter', confidence: 0.9 },

  // AngelList / Wellfound
  { pattern: /wellfound\.com\/jobs\//, platform: 'wellfound', confidence: 1.0 },
  { pattern: /angel\.co\/company\/[^/]+\/jobs\//, platform: 'wellfound', confidence: 1.0 },

  // Stack Overflow Jobs (now part of LinkedIn)
  { pattern: /stackoverflow\.com\/jobs\//, platform: 'stackoverflow', confidence: 1.0 },

  // Dice
  { pattern: /dice\.com\/job-detail\//, platform: 'dice', confidence: 1.0 },

  // We Work Remotely
  { pattern: /weworkremotely\.com\/remote-jobs\//, platform: 'weworkremotely', confidence: 1.0 },

  // Remote OK
  { pattern: /remoteok\.com\/remote-jobs\//, platform: 'remoteok', confidence: 1.0 },

  // Generic career page patterns
  { pattern: /\/careers?\/[^/]+\/[^/]+/, platform: 'generic', confidence: 0.6 },
  { pattern: /\/jobs?\/[^/]+/, platform: 'generic', confidence: 0.5 },
  { pattern: /\/positions?\/[^/]+/, platform: 'generic', confidence: 0.5 },
  { pattern: /\/vacancies?\/[^/]+/, platform: 'generic', confidence: 0.5 },
  { pattern: /greenhouse\.io\//, platform: 'greenhouse', confidence: 0.8 },
  { pattern: /lever\.co\//, platform: 'lever', confidence: 0.8 },
  { pattern: /workable\.com\//, platform: 'workable', confidence: 0.8 },
  { pattern: /ashbyhq\.com\//, platform: 'ashby', confidence: 0.8 },
  { pattern: /breezy\.hr\//, platform: 'breezy', confidence: 0.8 },
];

// Keywords that indicate a job posting
const JOB_KEYWORDS = [
  // English
  'apply now',
  'apply for this job',
  'job description',
  'responsibilities',
  'requirements',
  'qualifications',
  'about the role',
  'what you\'ll do',
  'what we\'re looking for',
  'experience required',
  'salary',
  'compensation',
  'benefits',
  'full-time',
  'part-time',
  'remote',
  'hybrid',
  'on-site',

  // Russian
  'откликнуться',
  'подать заявку',
  'описание вакансии',
  'обязанности',
  'требования',
  'условия',
  'опыт работы',
  'зарплата',
  'оклад',
  'полная занятость',
  'частичная занятость',
  'удаленная работа',
];

// Apply button selectors
const APPLY_BUTTON_SELECTORS = [
  'button[class*="apply"]',
  'a[class*="apply"]',
  'button[id*="apply"]',
  'a[id*="apply"]',
  '[data-test*="apply"]',
  '[data-testid*="apply"]',
  'button:contains("Apply")',
  'a:contains("Apply")',
  '.apply-button',
  '.job-apply',
  '#apply-now',
];

/**
 * Check URL against known job site patterns
 */
export function checkUrlPatterns(url) {
  for (const { pattern, platform, confidence } of JOB_SITE_PATTERNS) {
    if (pattern.test(url)) {
      return { isJobPage: true, platform, confidence, method: 'url_pattern' };
    }
  }
  return { isJobPage: false, platform: null, confidence: 0, method: 'url_pattern' };
}

/**
 * Check for JSON-LD JobPosting schema
 */
export function checkJsonLdSchema() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent);

      // Handle single object
      if (data['@type'] === 'JobPosting') {
        return {
          isJobPage: true,
          platform: 'schema.org',
          confidence: 0.95,
          method: 'json_ld',
          jobData: extractJobFromSchema(data),
        };
      }

      // Handle array of objects
      if (Array.isArray(data)) {
        const jobPosting = data.find((item) => item['@type'] === 'JobPosting');
        if (jobPosting) {
          return {
            isJobPage: true,
            platform: 'schema.org',
            confidence: 0.95,
            method: 'json_ld',
            jobData: extractJobFromSchema(jobPosting),
          };
        }
      }

      // Handle @graph structure
      if (data['@graph']) {
        const jobPosting = data['@graph'].find((item) => item['@type'] === 'JobPosting');
        if (jobPosting) {
          return {
            isJobPage: true,
            platform: 'schema.org',
            confidence: 0.95,
            method: 'json_ld',
            jobData: extractJobFromSchema(jobPosting),
          };
        }
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return { isJobPage: false, platform: null, confidence: 0, method: 'json_ld' };
}

/**
 * Extract job data from schema.org JobPosting
 */
function extractJobFromSchema(schema) {
  return {
    name: schema.title || schema.name || '',
    company: schema.hiringOrganization?.name || '',
    description: schema.description || '',
    keySkills: schema.skills || [],
    salary: schema.baseSalary
      ? `${schema.baseSalary.currency || ''} ${schema.baseSalary.value?.minValue || ''} - ${schema.baseSalary.value?.maxValue || ''}`
      : null,
    location: schema.jobLocation?.address?.addressLocality || '',
    datePosted: schema.datePosted || '',
  };
}

/**
 * Heuristic detection based on page content
 */
export function checkHeuristics() {
  const bodyText = document.body.innerText.toLowerCase();
  const pageTitle = document.title.toLowerCase();

  let score = 0;
  const matchedKeywords = [];

  // Check for job keywords
  for (const keyword of JOB_KEYWORDS) {
    if (bodyText.includes(keyword.toLowerCase())) {
      score += 1;
      matchedKeywords.push(keyword);
    }
    if (pageTitle.includes(keyword.toLowerCase())) {
      score += 2; // Keywords in title are more significant
      matchedKeywords.push(`[title] ${keyword}`);
    }
  }

  // Check for apply buttons
  const hasApplyButton = APPLY_BUTTON_SELECTORS.some((selector) => {
    try {
      return document.querySelector(selector) !== null;
    } catch {
      return false;
    }
  });

  if (hasApplyButton) {
    score += 5;
  }

  // Check for common job page structure
  const hasJobTitle =
    document.querySelector('h1')?.innerText.length < 100 &&
    (document.querySelector('h1')?.innerText.toLowerCase().includes('engineer') ||
      document.querySelector('h1')?.innerText.toLowerCase().includes('developer') ||
      document.querySelector('h1')?.innerText.toLowerCase().includes('manager') ||
      document.querySelector('h1')?.innerText.toLowerCase().includes('designer') ||
      document.querySelector('h1')?.innerText.toLowerCase().includes('analyst'));

  if (hasJobTitle) {
    score += 3;
  }

  // Calculate confidence (0-1)
  const confidence = Math.min(score / 15, 1);

  return {
    isJobPage: confidence > 0.4,
    platform: 'heuristic',
    confidence,
    method: 'heuristic',
    matchedKeywords,
  };
}

/**
 * Main detection function - combines all methods
 */
export function detectJobPage() {
  const url = window.location.href;

  // 1. Check URL patterns first (fastest, most reliable for known sites)
  const urlResult = checkUrlPatterns(url);
  if (urlResult.isJobPage && urlResult.confidence >= 0.8) {
    console.log('[ApplyHawk] Job page detected via URL pattern:', urlResult);
    return urlResult;
  }

  // 2. Check JSON-LD schema (very reliable when present)
  const schemaResult = checkJsonLdSchema();
  if (schemaResult.isJobPage) {
    console.log('[ApplyHawk] Job page detected via JSON-LD schema:', schemaResult);
    return schemaResult;
  }

  // 3. Use heuristics as fallback
  const heuristicResult = checkHeuristics();

  // Combine URL and heuristic confidence if URL had partial match
  if (urlResult.confidence > 0) {
    heuristicResult.confidence = Math.min(
      1,
      heuristicResult.confidence + urlResult.confidence * 0.5
    );
    heuristicResult.platform = urlResult.platform || heuristicResult.platform;
  }

  if (heuristicResult.isJobPage) {
    console.log('[ApplyHawk] Job page detected via heuristics:', heuristicResult);
  }

  return heuristicResult;
}

/**
 * Extract job description from page content
 */
export function extractJobContent() {
  // Try to find main content areas
  const selectors = [
    '[class*="job-description"]',
    '[class*="jobDescription"]',
    '[id*="job-description"]',
    '[class*="description"]',
    '[data-test*="description"]',
    'article',
    'main',
    '.content',
    '#content',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.length > 200) {
      return {
        title: document.querySelector('h1')?.innerText || document.title,
        content: element.innerText,
        url: window.location.href,
      };
    }
  }

  // Fallback: get body text
  return {
    title: document.querySelector('h1')?.innerText || document.title,
    content: document.body.innerText.substring(0, 10000),
    url: window.location.href,
  };
}
