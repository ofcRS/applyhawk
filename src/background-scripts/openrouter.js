/**
 * OpenRouter API client
 * Handles AI-powered cover letter generation
 */

import { getBaseResume, getSettings } from "../lib/storage.js";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

/**
 * Calculate aggressiveness level based on fit score
 * Lower fit = higher aggressiveness (more rewriting)
 *
 * @param {number} fitScore - 0.0 to 1.0
 * @param {number|null} override - Manual override value
 * @returns {number} - 0.0 to 1.0 aggressiveness level
 */
export function calculateAggressiveness(fitScore, override = null) {
  if (override !== null) {
    return Math.max(0, Math.min(1, override));
  }
  // fitScore 1.0 → aggressiveness 0.1
  // fitScore 0.0 → aggressiveness 0.95
  const aggressiveness = 1 - fitScore * 0.9;
  return Math.round(aggressiveness * 100) / 100;
}

/**
 * Check if vacancy should be skipped based on fit score
 *
 * @param {number} fitScore - 0.0 to 1.0
 * @param {number} minFitScore - Minimum fit score threshold
 * @param {number} maxAggressiveness - Maximum allowed aggressiveness
 * @returns {Object} - { skip: boolean, reason?: string }
 */
export function shouldSkipVacancy(
  fitScore,
  minFitScore = 0.15,
  maxAggressiveness = 0.95,
) {
  if (fitScore < minFitScore) {
    return {
      skip: true,
      reason: `fitScore ${fitScore.toFixed(2)} below minimum ${minFitScore}`,
    };
  }

  const aggressiveness = calculateAggressiveness(fitScore, null);
  if (aggressiveness > maxAggressiveness) {
    return {
      skip: true,
      reason: `required aggressiveness ${aggressiveness.toFixed(2)} exceeds maximum ${maxAggressiveness}`,
    };
  }

  return { skip: false };
}

/**
 * Assess how well a candidate matches a job vacancy
 *
 * @param {Object} vacancy - Vacancy data
 * @param {Object} resume - Candidate's resume
 * @returns {Object} - Fit assessment with scores, gaps, and strengths
 */
export async function assessFitScore(vacancy, resume) {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  const prompt = `You assess how well a candidate matches a job vacancy.

INPUT:
Vacancy: ${vacancy.name} at ${vacancy.company}
Required Skills: ${vacancy.keySkills?.join(", ") || "Not specified"}
Required Experience: ${vacancy.experience || "Not specified"}
Job Description: ${stripHtml(vacancy.description).substring(0, 2000)}

Candidate:
Title: ${resume.title}
Skills: ${resume.skills?.join(", ") || "Not specified"}
Experience: ${formatExperience(resume.experience)}

TASK:
Analyze match quality across dimensions.

SCORING CRITERIA:

skillMatch (0.0-1.0):
- 1.0: All required skills present with proven experience
- 0.7: Most required skills, missing 1-2 minor ones
- 0.5: Half of required skills present
- 0.3: Few skills match, but related technologies exist
- 0.0: No relevant skills

experienceMatch (0.0-1.0):
- 1.0: Same role, same industry, same scale
- 0.7: Same role, different industry OR same industry, slightly different role
- 0.5: Related role with transferable experience
- 0.3: Different role but some relevant exposure
- 0.0: Completely unrelated experience

seniorityMatch (0.0-1.0):
- 1.0: Exact seniority level match
- 0.7: One level difference (Senior applying for Middle, or vice versa)
- 0.4: Two levels difference
- 0.0: Vast seniority gap

stackOverlap (0.0-1.0):
- Count: (matching technologies) / (required technologies)
- Partial credit for similar tech (Vue→React = 0.5, Python→JavaScript = 0.3)

OUTPUT FORMAT (JSON only):
\`\`\`json
{
  "skillMatch": 0.0-1.0,
  "experienceMatch": 0.0-1.0,
  "seniorityMatch": 0.0-1.0,
  "stackOverlap": 0.0-1.0,
  "fitScore": 0.0-1.0,
  "gaps": ["skill or experience gaps that will need addressing"],
  "strengths": ["strongest matching points to emphasize"]
}
\`\`\`

Note: fitScore is weighted average: skills 0.35, experience 0.30, seniority 0.20, stack 0.15

Analyze now:`;

  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://hh-job-autoapply",
      "X-Title": "HH Job AutoApply",
    },
    body: JSON.stringify({
      model: settings.preferredModel || DEFAULT_MODEL,
      temperature: 0.3, // Low temperature for accurate assessment
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || "Failed to assess fit score");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No fit assessment generated");
  }

  try {
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);

    return {
      success: true,
      ...result,
      model: data.model,
      usage: data.usage,
    };
  } catch (parseError) {
    console.error(
      "[OpenRouter] Failed to parse fit assessment JSON:",
      parseError,
      content,
    );
    throw new Error("Failed to parse fit assessment. Please try again.");
  }
}

/**
 * Generate a cover letter for a specific vacancy
 *
 * @param {Object} vacancy - Vacancy data
 * @param {Object} resumeOverride - Resume to use (optional)
 * @param {Object} fitAssessment - Fit assessment from assessFitScore (optional)
 * @returns {Object} - { coverLetter, model, usage }
 */
export async function generateCoverLetter(
  vacancy,
  resumeOverride = null,
  fitAssessment = null,
) {
  const settings = await getSettings();
  const resume = resumeOverride || (await getBaseResume());

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  if (!resume) {
    throw new Error(
      "Resume not configured. Please fill in your resume in Options.",
    );
  }

  const prompt = await buildPrompt(
    vacancy,
    resume,
    settings.coverLetterTemplate,
    fitAssessment,
  );

  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://hh-job-autoapply",
      "X-Title": "HH Job AutoApply",
    },
    body: JSON.stringify({
      model: settings.preferredModel || DEFAULT_MODEL,
      temperature: 0.8,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || "Failed to generate cover letter");
  }

  const data = await response.json();
  const coverLetter = data.choices?.[0]?.message?.content;

  if (!coverLetter) {
    throw new Error("No cover letter generated");
  }

  return {
    success: true,
    coverLetter: coverLetter.trim(),
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Build the prompt for cover letter generation
 */
async function buildPrompt(vacancy, resume, customTemplate = null, fitAssessment = null) {
  // Get settings for contact info
  const settings = await getSettings();
  const contactTelegram = settings.contactTelegram || resume.contacts?.telegram || "";
  const contactEmail = settings.contactEmail || resume.contacts?.email || "";

  // Use custom template if provided
  if (customTemplate) {
    return interpolateTemplate(customTemplate, vacancy, resume);
  }

  const fitSection = fitAssessment
    ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || "N/A"}
Strengths: ${fitAssessment.strengths?.join(", ") || "None identified"}
Gaps: ${fitAssessment.gaps?.join(", ") || "None identified"}`
    : "";

  const strategySection = `
STRATEGY:
- Present candidate as ideal fit for this role
- Mention experience with key required skills: ${vacancy.keySkills?.slice(0, 4).join(", ") || "required technologies"}
- Be confident and specific`;

  // Default prompt template
  return `You write short cover letters for job applications.

INPUT:
Vacancy: ${vacancy.name} at ${vacancy.company}
Description: ${stripHtml(vacancy.description).substring(0, 2000)}
Key Skills: ${vacancy.keySkills?.join(", ") || "Not specified"}

Candidate: ${resume.fullName}, ${resume.title}
Experience: ${formatExperience(resume.experience)}
Skills: ${resume.skills?.join(", ") || "Not specified"}
${fitSection}

Contacts: ${contactTelegram}${contactTelegram && contactEmail ? ", " : ""}${contactEmail}

TASK:
Write a cover letter of 3-4 sentences.
${strategySection}

STRUCTURE:
1. First sentence: Specific interest in this company/product (not generic)
2. Middle (1-2 sentences): Best matching achievements${fitAssessment?.strengths ? ` from: ${fitAssessment.strengths.join(", ")}` : ""}. Include numbers.
3. Last sentence: Contacts

SPECIAL REQUIREMENTS CHECK:
Scan the job description for application instructions:
- "в отклике укажите", "напишите", "приложите", "ответьте", "code word", "mention"
If found → MUST include in letter

BANNED (RU): "В современном мире", "Являясь опытным специалистом", "Ваша компания", "впечатляет", "с большим интересом", "уникальная возможность"
BANNED (EN): "I am excited", "I believe I would be a great fit", "passionate about", "unique opportunity", "I am confident"

OUTPUT LANGUAGE: Match the job description language (Russian if job is in Russian)
OUTPUT: Letter text only. No greeting, no signature.`;
}

/**
 * Interpolate custom template with vacancy and resume data
 */
function interpolateTemplate(template, vacancy, resume) {
  return template
    .replace(/\{\{vacancy\.name\}\}/g, vacancy.name || "")
    .replace(/\{\{vacancy\.company\}\}/g, vacancy.company || "")
    .replace(
      /\{\{vacancy\.description\}\}/g,
      stripHtml(vacancy.description) || "",
    )
    .replace(/\{\{vacancy\.keySkills\}\}/g, vacancy.keySkills?.join(", ") || "")
    .replace(/\{\{vacancy\.experience\}\}/g, vacancy.experience || "")
    .replace(/\{\{resume\.fullName\}\}/g, resume.fullName || "")
    .replace(/\{\{resume\.title\}\}/g, resume.title || "")
    .replace(/\{\{resume\.summary\}\}/g, resume.summary || "")
    .replace(/\{\{resume\.experience\}\}/g, formatExperience(resume.experience))
    .replace(/\{\{resume\.skills\}\}/g, resume.skills?.join(", ") || "");
}

/**
 * Format experience array into readable text
 */
function formatExperience(experience) {
  if (!experience?.length) return "Опыт не указан";

  return experience
    .map((exp) => {
      const period = exp.endDate
        ? `${exp.startDate} - ${exp.endDate}`
        : `${exp.startDate} - настоящее время`;
      const achievements = exp.achievements?.length
        ? `\n  Достижения: ${exp.achievements.join("; ")}`
        : "";
      return `- ${exp.position} в ${exp.company} (${period})
  ${exp.description || ""}${achievements}`;
    })
    .join("\n");
}

/**
 * Strip HTML tags from text
 */
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a personalized resume tailored to a specific vacancy
 *
 * @param {Object} baseResume - User's base resume data
 * @param {Object} vacancy - Vacancy data (name, company, description, keySkills, etc.)
 * @param {Object} fitAssessment - Fit assessment from assessFitScore (optional)
 * @param {number} aggressiveness - Aggressiveness level 0.0-1.0 (optional, auto-calculated if not provided)
 * @returns {Object} - { experience: [...], keySkills: [...] } matching HH.ru format
 */
export async function generatePersonalizedResume(
  baseResume,
  vacancy,
  fitAssessment = null,
  aggressiveness = null,
) {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  if (!baseResume || !baseResume.experience?.length) {
    throw new Error(
      "Base resume with experience not configured. Please fill in your resume in Options.",
    );
  }

  // Calculate aggressiveness if not provided
  const effectiveAggressiveness =
    aggressiveness ??
    (fitAssessment
      ? calculateAggressiveness(
          fitAssessment.fitScore,
          settings.aggressiveFit?.aggressivenessOverride,
        )
      : 0.5);

  const prompt = buildResumePrompt(
    baseResume,
    vacancy,
    fitAssessment,
    effectiveAggressiveness,
  );

  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://hh-job-autoapply",
      "X-Title": "HH Job AutoApply",
    },
    body: JSON.stringify({
      model: settings.preferredModel || DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || "Failed to generate personalized resume",
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No resume generated");
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);

    return {
      success: true,
      experience: result.experience || [],
      keySkills: result.keySkills || [],
      title: result.title || baseResume.title,
      appliedAggressiveness: effectiveAggressiveness,
      originalFitScore: fitAssessment?.fitScore ?? null,
      model: data.model,
      usage: data.usage,
    };
  } catch (parseError) {
    console.error(
      "[OpenRouter] Failed to parse resume JSON:",
      parseError,
      content,
    );
    throw new Error("Failed to parse generated resume. Please try again.");
  }
}

/**
 * Parse a resume from PDF text content using AI
 *
 * @param {string} pdfText - Extracted text from PDF
 * @returns {Object} - Parsed resume matching our storage format
 */
export async function parseResumePDF(pdfText) {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  const prompt = `You are an expert resume parser. Extract structured data from this resume text.

RESUME TEXT:
${pdfText}

OUTPUT FORMAT (JSON only, no explanation):
\`\`\`json
{
  "fullName": "Full name of the person",
  "title": "Desired job title / current profession",
  "summary": "Professional summary or about section (if present, otherwise empty string)",
  "experience": [
    {
      "company": "Company name",
      "position": "Job title",
      "startDate": "YYYY-MM format (e.g., 2023-01)",
      "endDate": "YYYY-MM format or null if current job",
      "description": "Job description and responsibilities",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "institution": "University/School name",
      "degree": "Degree type and field",
      "year": 2023
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "contacts": {
    "email": "email@example.com",
    "phone": "+1234567890",
    "telegram": "@username or empty string"
  }
}
\`\`\`

REQUIREMENTS:
1. Extract ALL work experience entries in chronological order (most recent first)
2. Parse dates carefully - convert "Feb 2025" to "2025-02", "Present" to null
3. Skills should be individual items, not grouped
4. If a field is not found in the resume, use empty string or empty array
5. For achievements, extract quantifiable results if mentioned in the job description
6. Return ONLY the JSON, no additional text

Parse the resume now:`;

  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "chrome-extension://hh-job-autoapply",
      "X-Title": "HH Job AutoApply",
    },
    body: JSON.stringify({
      model: settings.preferredModel || DEFAULT_MODEL,
      temperature: 0.3, // Lower temperature for more accurate parsing
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || "Failed to parse resume");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  // Parse the JSON response
  try {
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const result = JSON.parse(jsonStr);

    return {
      success: true,
      resume: result,
      model: data.model,
      usage: data.usage,
    };
  } catch (parseError) {
    console.error(
      "[OpenRouter] Failed to parse resume JSON:",
      parseError,
      content,
    );
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

/**
 * Build prompt for personalized resume generation with aggressiveness
 */
function buildResumePrompt(
  baseResume,
  vacancy,
  fitAssessment = null,
  aggressiveness = 0.5,
) {
  const baseExperience = baseResume.experience
    .map((exp, i) => {
      return `[${i + 1}] ${exp.position} at ${exp.company}
Start: ${exp.startDate}
End: ${exp.endDate || "Present"}
Description:
${exp.description}
Achievements: ${exp.achievements?.join("; ") || "None listed"}`;
    })
    .join("\n\n");

  const fitSection = fitAssessment
    ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || "N/A"}
Gaps: ${fitAssessment.gaps?.join(", ") || "None identified"}
Strengths: ${fitAssessment.strengths?.join(", ") || "None identified"}`
    : "";

  return `You are a resume optimization specialist.

INPUT:
Vacancy: ${vacancy.name} at ${vacancy.company}
Required Skills: ${vacancy.keySkills?.join(", ") || "Not specified"}
Required Experience: ${vacancy.experience || "Not specified"}
Job Description: ${stripHtml(vacancy.description).substring(0, 2500)}

Candidate Resume:
Name: ${baseResume.fullName}
Title: ${baseResume.title}
Skills: ${baseResume.skills?.join(", ") || "Not specified"}

WORK EXPERIENCE:
${baseExperience}
${fitSection}

CALCULATED AGGRESSIVENESS: ${aggressiveness.toFixed(2)} (0.0 to 1.0)

TASK:
Rewrite experience using the aggressiveness level.${fitAssessment ? ` Focus on:
- Highlighting: ${fitAssessment.strengths?.join(", ") || "relevant experience"}
- Addressing gaps: ${fitAssessment.gaps?.join(", ") || "none"}` : ""}

AGGRESSIVENESS BEHAVIOR:

0.0-0.2 (Conservative) — strong match:
- Reorder bullets, most relevant first
- Light terminology alignment
- Add missing required skills to keySkills

0.3-0.5 (Moderate) — decent match:
- Active rephrasing toward vacancy language
- Add required skills to experience descriptions
- Add all required technologies to keySkills

0.6-0.8 (Aggressive) — weak match:
- Reframe all experience through vacancy lens
- Every bullet should connect to requirements
- Add ALL required skills to experience descriptions
- Add ALL required technologies to keySkills
- Highlight learning speed, adaptability

0.9-1.0 (Maximum) — very weak match:
- Complete rewrite to match vacancy perfectly
- Add ALL required skills from vacancy to keySkills
- Weave ALL required technologies into experience descriptions naturally
- Present candidate as ideal fit for this specific role
- Every experience should demonstrate relevant skills from vacancy

CONSTRAINTS:
- Company names, positions, dates: NEVER change
- Write compelling, believable descriptions that match vacancy requirements
- keySkills MUST include all skills mentioned in vacancy requirements

OUTPUT LANGUAGE: Match the job description language (Russian if job is in Russian)

OUTPUT FORMAT (JSON only):
\`\`\`json
{
  "title": "optimized title matching vacancy",
  "experience": [
    {
      "companyName": "exact company name",
      "position": "exact position",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "- Bullet point 1\\n- Bullet point 2\\n- Bullet point 3"
    }
  ],
  "keySkills": ["ordered by relevance, 7-12 items"]
}
\`\`\`

Generate the personalized resume now:`;
}
