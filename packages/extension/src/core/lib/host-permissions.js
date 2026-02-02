/**
 * Host Permissions Helper
 * Utilities for checking and managing dynamic host permissions
 */

/**
 * Domains that already have declarative host_permissions or content_scripts
 * in the manifest — no need to request permission for these.
 */
const KNOWN_DOMAINS = [
  "hh.ru",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "workday.com",
  "icims.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "openrouter.ai",
];

/**
 * Check if a URL belongs to a site already covered by manifest host_permissions
 * @param {string} url
 * @returns {boolean}
 */
export function isKnownJobSite(url) {
  try {
    const hostname = new URL(url).hostname;
    return KNOWN_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

/**
 * Convert a URL to an origin match pattern for chrome.permissions API
 * e.g. "https://jobs.personio.de/foo" → "https://*.personio.de/*"
 * @param {string} url
 * @returns {string}
 */
export function getOriginPattern(url) {
  try {
    const { protocol, hostname } = new URL(url);
    // Strip leading subdomain to get wildcard pattern
    const parts = hostname.split(".");
    const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
    return `${protocol}//*.${domain}/*`;
  } catch {
    return null;
  }
}

/**
 * Check if the extension currently has host permission for a URL
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function hasHostPermission(url) {
  if (isKnownJobSite(url)) return true;
  try {
    const pattern = getOriginPattern(url);
    if (!pattern) return false;
    return await chrome.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}
