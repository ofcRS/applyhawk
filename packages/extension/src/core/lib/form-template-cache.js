/**
 * Form Template Cache
 * Caches ATS form field structures to skip redundant AI HTML analysis calls.
 * On cache hit, only the cheaper generateFormFillAnswers() call is needed.
 */

const STORAGE_KEY = "formTemplateCache";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_FAIL_COUNT = 3;

/**
 * URL patterns mapped to cache keys for known ATS platforms
 */
const ATS_CACHE_PATTERNS = [
  { pattern: /\.greenhouse\.io\//, key: "greenhouse:application" },
  { pattern: /\.lever\.co\//, key: "lever:application" },
  { pattern: /\.myworkdayjobs\.com\//, key: "workday:application" },
  { pattern: /\.workday\.com\/.*\/job\//, key: "workday:application" },
  { pattern: /\.ashbyhq\.com\//, key: "ashby:application" },
  { pattern: /\.smartrecruiters\.com\//, key: "smartrecruiters:application" },
  { pattern: /\.icims\.com\//, key: "icims:application" },
];

/**
 * Derive a cache key from a URL if it matches a known ATS platform.
 * @param {string} url
 * @returns {string|null}
 */
export function getCacheKey(url) {
  if (!url) return null;
  for (const { pattern, key } of ATS_CACHE_PATTERNS) {
    if (pattern.test(url)) return key;
  }
  return null;
}

/**
 * Read the full cache map from storage.
 * @returns {Promise<Object>}
 */
async function readCacheMap() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {};
}

/**
 * Write the full cache map to storage.
 * @param {Object} cacheMap
 */
async function writeCacheMap(cacheMap) {
  await chrome.storage.local.set({ [STORAGE_KEY]: cacheMap });
}

/**
 * Get a cached template if it exists, is within TTL, and hasn't exceeded fail count.
 * @param {string} cacheKey
 * @returns {Promise<{fields: Array, createdAt: number}|null>}
 */
export async function getCachedTemplate(cacheKey) {
  const cacheMap = await readCacheMap();
  const entry = cacheMap[cacheKey];
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    console.log(`[FormCache] TTL expired for ${cacheKey}, removing`);
    delete cacheMap[cacheKey];
    await writeCacheMap(cacheMap);
    return null;
  }

  // Check fail count
  if ((entry.failCount || 0) >= MAX_FAIL_COUNT) {
    console.log(`[FormCache] Max failures reached for ${cacheKey}, removing`);
    delete cacheMap[cacheKey];
    await writeCacheMap(cacheMap);
    return null;
  }

  return entry;
}

/**
 * Save a field template to cache.
 * Strips runtime values (suggestedValue, confidence, note) — only structure is cached.
 * @param {string} cacheKey
 * @param {Array} fields - Field objects from AI response
 */
export async function saveTemplate(cacheKey, fields) {
  const strippedFields = fields.map((f) => ({
    selector: f.selector,
    label: f.label,
    type: f.type,
    ...(f.options ? { options: f.options } : {}),
  }));

  const cacheMap = await readCacheMap();
  cacheMap[cacheKey] = {
    fields: strippedFields,
    createdAt: Date.now(),
    failCount: 0,
  };
  await writeCacheMap(cacheMap);

  console.log(
    `[FormCache] Saved template for ${cacheKey} with ${strippedFields.length} fields`,
  );
}

/**
 * Increment the fail counter for a cache entry.
 * Auto-invalidates if exceeding MAX_FAIL_COUNT.
 * @param {string} cacheKey
 */
export async function incrementFailCount(cacheKey) {
  const cacheMap = await readCacheMap();
  const entry = cacheMap[cacheKey];
  if (!entry) return;

  entry.failCount = (entry.failCount || 0) + 1;

  if (entry.failCount >= MAX_FAIL_COUNT) {
    console.log(
      `[FormCache] Fail count ${entry.failCount} >= ${MAX_FAIL_COUNT} for ${cacheKey}, invalidating`,
    );
    delete cacheMap[cacheKey];
  }

  await writeCacheMap(cacheMap);
}

/**
 * Reset the fail counter on a successful fill.
 * @param {string} cacheKey
 */
export async function resetFailCount(cacheKey) {
  const cacheMap = await readCacheMap();
  const entry = cacheMap[cacheKey];
  if (!entry) return;

  entry.failCount = 0;
  await writeCacheMap(cacheMap);
}

/**
 * Remove a single cached template.
 * @param {string} cacheKey
 */
export async function invalidateTemplate(cacheKey) {
  const cacheMap = await readCacheMap();
  delete cacheMap[cacheKey];
  await writeCacheMap(cacheMap);
  console.log(`[FormCache] Invalidated template for ${cacheKey}`);
}

/**
 * Clear the entire form template cache.
 */
export async function clearAllTemplates() {
  await chrome.storage.local.remove(STORAGE_KEY);
  console.log("[FormCache] All templates cleared");
}
