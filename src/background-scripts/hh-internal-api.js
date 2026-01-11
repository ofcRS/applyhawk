/**
 * HH.ru Internal API Client
 *
 * Uses HH.ru's internal endpoints discovered via network interception.
 * Requires user to be logged in on hh.ru (uses session cookies).
 */

const RESUME_API_BASE = "https://resume-profile-front.hh.ru";
const HH_BASE = "https://hh.ru";

/**
 * Normalize date to YYYY-MM-DD format required by HH.ru API
 * Handles: "2025-02", "2025-02-15", null, undefined
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // YYYY-MM format - append -01
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return `${dateStr}-01`;
  }

  // Try to parse other formats
  const date = new Date(dateStr);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return dateStr; // Return as-is if unparseable
}

/**
 * Get XSRF token from cookies
 * The token is stored in the _xsrf cookie
 */
async function getXsrfToken() {
  try {
    const cookie = await chrome.cookies.get({
      url: "https://hh.ru",
      name: "_xsrf",
    });

    if (cookie && cookie.value) {
      return cookie.value;
    }

    // Fallback: try to get from hhtoken cookie
    const hhtoken = await chrome.cookies.get({
      url: "https://hh.ru",
      name: "hhtoken",
    });

    if (hhtoken && hhtoken.value) {
      return hhtoken.value;
    }

    throw new Error("XSRF token not found. Please log in to HH.ru first.");
  } catch (error) {
    console.error("[HH API] Failed to get XSRF token:", error);
    throw error;
  }
}

/**
 * Make an authenticated request to HH.ru internal API
 */
async function makeHHRequest(url, options = {}) {
  const xsrfToken = await getXsrfToken();

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Xsrftoken": xsrfToken,
    "X-Requested-With": "XMLHttpRequest",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HH.ru API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // Check for validation errors in response body (API returns 200 with errors array)
  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors
      .map(
        (e) =>
          `${e.fieldNamePath || e.field || "unknown"}: ${e.code || e.message || "validation error"}`,
      )
      .join("; ");
    console.error("[HH API] Validation errors:", data.errors);
    throw new Error(`HH.ru API validation error: ${errorMessages}`);
  }

  return data;
}

/**
 * Update resume experience section
 *
 * @param {string} resumeHash - Resume identifier (e.g., "0a6710a7ff0fe2dac80039ed1f493576455962")
 * @param {Array} experience - Array of experience objects
 */
export async function updateResumeExperience(resumeHash, experience) {
  const url = `${RESUME_API_BASE}/profile/shards/resume/update`;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "experience",
    profile: {},
    questionToAnswerMap: {},
    resumeHash: resumeHash,
    resume: {
      experience: experience.map((exp) => ({
        companyAreaId: exp.companyAreaId || null,
        companyId: exp.companyId || null,
        companyIndustries: exp.companyIndustries || [],
        companyIndustryId: exp.companyIndustryId || null,
        companyName: exp.companyName,
        companyState: exp.companyState || null,
        companyUrl: exp.companyUrl || null,
        description: exp.description || "", // Ensure non-null (required by API)
        employerId: exp.employerId || null,
        endDate: normalizeDate(exp.endDate), // Normalize to YYYY-MM-DD
        id: exp.id || null,
        industries: exp.industries || [],
        position: exp.position,
        startDate: normalizeDate(exp.startDate), // Normalize to YYYY-MM-DD
      })),
    },
  };

  console.log("[HH API] Updating experience:", body);
  return makeHHRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Update resume key skills section
 *
 * @param {string} resumeHash - Resume identifier
 * @param {Array<string>} keySkills - Array of skill strings
 */
export async function updateResumeSkills(resumeHash, keySkills) {
  const url = `${RESUME_API_BASE}/profile/shards/resume/update`;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "keyskills",
    profile: {},
    questionToAnswerMap: {},
    resumeHash: resumeHash,
    resume: {
      keySkills: keySkills,
    },
  };

  console.log("[HH API] Updating skills:", body);
  return makeHHRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Update resume skill levels section (required step for publishing)
 *
 * @param {string} resumeHash - Resume identifier
 * @param {Array} userSkillLevels - Optional skill verification levels
 */
export async function updateResumeSkillLevels(
  resumeHash,
  userSkillLevels = [],
) {
  const url = `${RESUME_API_BASE}/profile/shards/resume/update`;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "skill_levels",
    profile: {},
    questionToAnswerMap: {},
    resume: {},
    resumeHash: resumeHash,
    userSkillLevels: userSkillLevels,
  };

  console.log("[HH API] Updating skill_levels:", body);
  return makeHHRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Apply to a vacancy with cover letter
 *
 * @param {string} vacancyId - Vacancy ID from URL
 * @param {string} resumeHash - Resume hash to apply with
 * @param {string} coverLetter - Cover letter text
 */
export async function applyToVacancy(vacancyId, resumeHash, coverLetter) {
  const url = `${HH_BASE}/applicant/vacancy_response/popup`;
  const xsrfToken = await getXsrfToken();

  // This endpoint expects form-encoded data, not JSON
  const formData = new URLSearchParams({
    _xsrf: xsrfToken,
    vacancy_id: vacancyId,
    resume_hash: resumeHash,
    letter: coverLetter || "",
    incomplete: "false",
    ignore_postponed: "true",
    lux: "true",
    withoutTest: "no",
    country_ids: "[]",
    mark_applicant_visible_in_vacancy_country: "false",
    hhtmFromLabel: "vacancy_response",
    hhtmSourceLabel: "",
  });

  console.log(
    "[HH API] Applying to vacancy:",
    vacancyId,
    "with resume:",
    resumeHash,
  );
  console.log("[HH API] Apply request body:", formData.toString());

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Xsrftoken": xsrfToken,
      "X-Requested-With": "XMLHttpRequest",
      "X-hhtmFrom": "vacancy",
      "X-hhtmSource": "vacancy",
    },
    credentials: "include",
    body: formData.toString(),
  });

  const responseText = await response.text();
  console.log("[HH API] Apply response status:", response.status);
  console.log("[HH API] Apply response:", responseText);

  let result;
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Application failed ${response.status}: ${responseText}`);
  }

  // Check for error in response body
  if (result.error) {
    // Try to get more details about the error
    console.error("[HH API] Apply error details:", result);
    throw new Error(
      `Application failed: ${result.error}${result.message ? ` - ${result.message}` : ""}`,
    );
  }

  if (!response.ok) {
    throw new Error(`Application failed ${response.status}: ${responseText}`);
  }

  console.log("[HH API] Application successful:", result);

  return {
    success: true,
    chatId: result.chat_id,
    ...result,
  };
}

/**
 * Parse resume data from HH.ru API response
 * Extracts rich information for display in resume selector
 * Handles both direct values and nested {string: value} format
 */
function parseResumeData(r) {
  const attrs = r._attributes || {};
  const hash = attrs.hash || r.hash;

  // Helper to extract value from nested format like [{string: "value"}] or direct value
  const extractValue = (field) => {
    if (Array.isArray(field) && field[0]?.string !== undefined) {
      return field[0].string;
    }
    if (Array.isArray(field) && field.length > 0) {
      return field[0];
    }
    return field;
  };

  // Helper to extract array of strings from nested format like [{string: "a"}, {string: "b"}]
  const extractStringArray = (field) => {
    if (!Array.isArray(field)) return [];
    return field.map((item) =>
      item?.string !== undefined ? item.string : item,
    );
  };

  // Parse title
  const rawTitle = extractValue(r.title);
  const title = rawTitle || `Resume ${(hash || "").substring(0, 8)}...`;

  // Parse status: modified, not_finished, ok, new
  const rawStatus = attrs.status || r.status || "unknown";
  let status = "draft";
  if (rawStatus === "not_finished") {
    status = "draft";
  } else if (
    rawStatus === "modified" ||
    rawStatus === "ok" ||
    rawStatus === "new"
  ) {
    status = attrs.isSearchable ? "published" : "hidden";
  }

  // Parse skills (limit to 5 for display)
  const keySkills = extractStringArray(r.keySkills).slice(0, 5);

  // Parse experience (in months) - can be [{string: 83}] or just 83
  const rawExp = extractValue(r.totalExperience);
  const totalExperience = typeof rawExp === "number" ? rawExp : 0;

  // Parse updated timestamp
  const updatedAt = attrs.updated || attrs.lastEditTime || Date.now();

  return {
    hash,
    title,
    status,
    isPublished: status === "published",
    keySkills,
    totalExperience,
    updatedAt,
  };
}

/**
 * Get user's resumes list from HH.ru
 * Fetches the page and parses JSON data if available
 * Returns rich data for resume selector display
 */
export async function getUserResumes() {
  const url = `${HH_BASE}/applicant/resumes`;

  try {
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resumes: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    // Try to parse as JSON if server returns JSON
    if (contentType?.includes("application/json")) {
      const data = await response.json();

      if (!data.applicantResumes?.length) {
        return { success: true, resumes: [] };
      }

      const resumes = data.applicantResumes.map(parseResumeData);
      return { success: true, resumes };
    }

    // Fallback: parse HTML page
    const html = await response.text();

    // Try to extract applicantResumes JSON from HTML
    // The data is embedded as part of a larger JSON object in the page
    const startMarker = '"applicantResumes":[';
    const startIdx = html.indexOf(startMarker);

    if (startIdx !== -1) {
      try {
        // Find the array start
        const arrayStart = startIdx + startMarker.length - 1; // position of '['

        // Parse the array by counting brackets
        let depth = 0;
        let arrayEnd = arrayStart;
        for (let i = arrayStart; i < html.length; i++) {
          const char = html[i];
          if (char === "[") depth++;
          else if (char === "]") {
            depth--;
            if (depth === 0) {
              arrayEnd = i + 1;
              break;
            }
          }
        }

        const jsonArray = html.substring(arrayStart, arrayEnd);
        const applicantResumes = JSON.parse(jsonArray);

        if (applicantResumes?.length > 0) {
          console.log(
            "[HH API] Parsed",
            applicantResumes.length,
            "resumes from HTML",
          );
          const resumes = applicantResumes.map(parseResumeData);
          return { success: true, resumes };
        }
      } catch (e) {
        console.warn("[HH API] Failed to parse embedded JSON:", e);
      }
    }

    // Fallback: extract resume hashes from HTML
    const resumePattern = /\/resume\/([a-f0-9]{32,})/g;
    const matches = [...html.matchAll(resumePattern)];
    const uniqueHashes = [...new Set(matches.map((m) => m[1]))];

    const resumes = uniqueHashes.map((hash) => ({
      hash,
      title: `Resume ${hash.substring(0, 8)}...`,
      status: "unknown",
      isPublished: true,
      keySkills: [],
      totalExperience: 0,
      updatedAt: Date.now(),
    }));

    return { success: true, resumes };
  } catch (error) {
    console.error("[HH API] Failed to get resumes:", error);
    return { success: false, error: error.message, resumes: [] };
  }
}

/**
 * Check if user is logged in to HH.ru
 */
export async function checkHHAuth() {
  try {
    const xsrf = await getXsrfToken();
    return { success: true, isLoggedIn: !!xsrf };
  } catch {
    return { success: false, isLoggedIn: false };
  }
}

/**
 * Update resume personal info and phone (common screen)
 *
 * @param {string} resumeHash - Resume identifier
 * @param {Object} personalInfo - Personal info object
 */
export async function updateResumeCommon(resumeHash, personalInfo) {
  const url = `${RESUME_API_BASE}/profile/shards/resume/update`;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "common",
    profile: {
      area: [personalInfo.areaId || "1"], // Default: Moscow
      birthday: [personalInfo.birthday || "1995-01-01"],
      citizenship: [personalInfo.citizenshipId || "113"], // Default: Russia
      firstName: [personalInfo.firstName],
      lastName: [personalInfo.lastName],
      middleName: personalInfo.middleName ? [personalInfo.middleName] : [],
      gender: [personalInfo.gender || "male"],
      workTicket: [personalInfo.workTicketId || "113"],
    },
    questionToAnswerMap: {},
    resume: {
      phone: [
        {
          formatted: personalInfo.phone,
          type: "cell",
        },
      ],
    },
    resumeHash: resumeHash,
  };

  console.log("[HH API] Updating common (personal info + phone):", body);
  return makeHHRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Update resume education
 *
 * @param {string} resumeHash - Resume identifier
 * @param {Array} education - Array of education objects
 */
export async function updateResumeEducation(resumeHash, education) {
  const url = `${RESUME_API_BASE}/profile/shards/resume/update`;

  // If education is provided, map it to the expected format
  // If empty, send empty profile to just advance the screen
  const hasEducation = education && education.length > 0;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "educations",
    profile: hasEducation
      ? {
          elementaryEducation: [],
          primaryEducation: education.map((edu) => ({
            educationLevel: edu.level || edu.educationLevel || "higher",
            name: edu.institution || edu.name || "",
            organization: edu.faculty || edu.organization || null,
            result: edu.degree || edu.result || null,
            year: edu.year || new Date().getFullYear(),
            facultyId: null,
            specialtyId: null,
            universityId: null,
            id: edu.id || null,
          })),
        }
      : {
          // Empty education - just advance the screen
          elementaryEducation: [],
        },
    questionToAnswerMap: {},
    resume: {},
    resumeHash: resumeHash,
  };

  console.log("[HH API] Updating education:", body);
  return makeHHRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Create a complete publishable resume with all required fields
 *
 * @param {Object} baseResume - Base resume from extension settings
 * @param {Object} personalizedData - AI-personalized experience and skills
 * @param {string} title - Resume title
 * @returns {Object} - { success, resumeHash }
 */
export async function createCompleteResume(
  baseResume,
  personalizedData,
  title,
) {
  console.log("[HH API] Creating complete resume:", title);
  console.log(
    "[HH API] personalizedData:",
    JSON.stringify(personalizedData, null, 2),
  );

  // 1. Create initial resume shell
  const createResult = await createResume(title, "96");
  if (!createResult.success) {
    return createResult;
  }

  const resumeHash = createResult.resumeHash;
  console.log("[HH API] Created resume shell:", resumeHash);

  try {
    // 2. Fill common (personal info + phone) → nextScreen: educations
    const nameParts = (baseResume.fullName || "").split(" ");
    console.log("[HH API] Step 2: Updating common...");
    await updateResumeCommon(resumeHash, {
      firstName: nameParts[0] || "Name",
      lastName: nameParts.slice(1).join(" ") || "Surname",
      phone: baseResume.contacts?.phone || "+7 000 000-00-00",
      birthday: baseResume.birthday || "1995-01-01",
      gender: baseResume.gender || "male",
      areaId: baseResume.areaId || "1",
      citizenshipId: baseResume.citizenshipId || "113",
    });

    // 3. Fill education → nextScreen: keyskills
    // ALWAYS call, even with empty array - API needs this to advance screen
    console.log("[HH API] Step 3: Updating education...");
    await updateResumeEducation(resumeHash, baseResume.education || []);

    // 4. Fill keyskills → nextScreen: skill_levels
    // ALWAYS call, even with empty array
    const skills = personalizedData.keySkills || [];
    console.log("[HH API] Step 4: Updating keyskills:", skills);
    await updateResumeSkills(resumeHash, skills);

    // 5. Fill skill_levels → nextScreen: experience
    console.log("[HH API] Step 5: Updating skill_levels...");
    await updateResumeSkillLevels(resumeHash, []);

    // 6. Fill experience (LAST step) → status becomes "new" (publishable)
    const experience = personalizedData.experience || [];
    console.log(
      "[HH API] Step 6: Updating experience:",
      experience.length,
      "items",
    );
    await updateResumeExperience(resumeHash, experience);

    console.log("[HH API] Complete resume created successfully:", resumeHash);
    return { success: true, resumeHash };
  } catch (error) {
    console.error("[HH API] Failed to fill resume:", error);
    return { success: false, error: error.message, resumeHash };
  }
}

/**
 * Create a new resume on HH.ru
 *
 * @param {string} title - Resume title (e.g., "Frontend Developer для Yandex")
 * @param {string} professionalRoleId - HH.ru role ID (e.g., "96" for developer)
 * @returns {Object} - { success, resumeHash, nextScreen }
 */
export async function createResume(title, professionalRoleId = "96") {
  const url = `${RESUME_API_BASE}/profile/shards/resume/create`;

  // Truncate title if too long (HH.ru has a limit)
  const safeTitle = title.length > 50 ? title.substring(0, 50) : title;

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "professional_role",
    entryPoint: null,
    profile: {},
    resume: {
      professionalRole: [professionalRoleId],
      title: [safeTitle],
    },
  };

  console.log("[HH API] Creating resume:", body);

  try {
    const data = await makeHHRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    console.log("[HH API] Resume created:", data);

    // Check for errors in response
    if (data.errors && data.errors.length > 0) {
      console.error("[HH API] Resume creation errors:", data.errors);
      return {
        success: false,
        error: data.errors
          .map((e) => e.message || e.key || JSON.stringify(e))
          .join(", "),
      };
    }

    // resumeHash is in data.resume._attributes.hash, not at root
    const resumeHash = data.resume?._attributes?.hash || data.resumeHash;

    if (!resumeHash) {
      console.error("[HH API] No resumeHash in response:", data);
      return {
        success: false,
        error: "No resumeHash returned from API",
      };
    }

    return {
      success: true,
      resumeHash: resumeHash,
      nextScreen: data.nextIncompleteScreenId,
    };
  } catch (error) {
    console.error("[HH API] Failed to create resume:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
