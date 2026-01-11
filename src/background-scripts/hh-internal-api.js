/**
 * HH.ru Internal API Client
 *
 * Uses HH.ru's internal endpoints discovered via network interception.
 * Requires user to be logged in on hh.ru (uses session cookies).
 */

const RESUME_API_BASE = "https://resume-profile-front.hh.ru";
const HH_BASE = "https://hh.ru";

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

  return response.json();
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
        description: exp.description,
        employerId: exp.employerId || null,
        endDate: exp.endDate || null,
        id: exp.id || null,
        industries: exp.industries || [],
        position: exp.position,
        startDate: exp.startDate,
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

  console.log("[HH API] Applying to vacancy:", vacancyId);

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Application failed ${response.status}: ${errorText}`);
  }

  const result = await response.json();
  console.log("[HH API] Application result:", result);

  return {
    success: true,
    chatId: result.chat_id,
    ...result,
  };
}

/**
 * Get user's resumes list from HH.ru
 * Extracts resume hashes from the applicant resumes page
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

    const html = await response.text();

    // Parse resume hashes from the page
    // Look for patterns like /resume/0a6710a7ff0fe2dac80039ed1f493576455962
    const resumePattern = /\/resume\/([a-f0-9]{32,})/g;
    const matches = [...html.matchAll(resumePattern)];
    const uniqueHashes = [...new Set(matches.map((m) => m[1]))];

    // Try to extract resume titles from the page
    const resumes = uniqueHashes.map((hash) => {
      // Look for the title near the hash in the HTML
      const titlePattern = new RegExp(
        `data-qa="resume[^"]*"[^>]*>([^<]+)<[^]*?${hash}`,
        "i",
      );
      const titleMatch = html.match(titlePattern);

      return {
        hash: hash,
        title: titleMatch
          ? titleMatch[1].trim()
          : `Resume ${hash.substring(0, 8)}...`,
      };
    });

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

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "educations",
    profile: {
      elementaryEducation: [],
      primaryEducation: education.map((edu) => ({
        educationLevel: edu.level || "higher",
        name: edu.institution,
        organization: edu.faculty || null,
        result: edu.degree || null,
        year: edu.year,
        facultyId: null,
        specialtyId: null,
        universityId: null,
        id: null,
      })),
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

  // 1. Create initial resume
  const createResult = await createResume(title, "96");
  if (!createResult.success) {
    return createResult;
  }

  const resumeHash = createResult.resumeHash;
  console.log("[HH API] Created resume shell:", resumeHash);

  try {
    // 2. Fill common (personal info + phone)
    const nameParts = (baseResume.fullName || "").split(" ");
    await updateResumeCommon(resumeHash, {
      firstName: nameParts[0] || "Name",
      lastName: nameParts.slice(1).join(" ") || "Surname",
      phone: baseResume.contacts?.phone || "+7 000 000-00-00",
      birthday: baseResume.birthday || "1995-01-01",
      gender: baseResume.gender || "male",
      areaId: baseResume.areaId || "1",
      citizenshipId: baseResume.citizenshipId || "113",
    });

    // 3. Fill education
    if (baseResume.education?.length) {
      await updateResumeEducation(resumeHash, baseResume.education);
    }

    // 4. Fill experience
    if (personalizedData.experience?.length) {
      await updateResumeExperience(resumeHash, personalizedData.experience);
    }

    // 5. Fill skills
    if (personalizedData.keySkills?.length) {
      await updateResumeSkills(resumeHash, personalizedData.keySkills);
    }

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

  const body = {
    additionalProperties: { anyJob: false },
    currentScreenId: "professional_role",
    entryPoint: null,
    profile: {},
    resume: {
      professionalRole: [professionalRoleId],
      title: [title],
    },
  };

  console.log("[HH API] Creating resume:", body);

  try {
    const data = await makeHHRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    console.log("[HH API] Resume created:", data);

    return {
      success: true,
      resumeHash: data.resumeHash,
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
