/**
 * OpenRouter API client
 * Handles AI-powered cover letter generation
 */

import { buildPromptFromTemplate, interpolate } from "../lib/prompt-loader.js";
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
 * Make an API call to OpenRouter
 *
 * @param {Object} options - API call options
 * @returns {Promise<Object>} - API response data
 */
async function callOpenRouter({
  apiKey,
  model,
  messages,
  temperature,
  max_tokens,
}) {
  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      temperature,
      max_tokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `API request failed: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Extract content from OpenRouter response
 *
 * @param {Object} data - API response
 * @param {string} errorContext - Context for error messages
 * @returns {string} - Response content
 */
function extractContent(data, errorContext) {
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error(
      `[OpenRouter] No content in ${errorContext}. Full response:`,
      data,
    );
    if (data.error) {
      throw new Error(
        `${errorContext} API error: ${data.error.message || JSON.stringify(data.error)}`,
      );
    }
    throw new Error(
      `No ${errorContext} generated - empty response from AI model`,
    );
  }

  return content;
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 *
 * @param {string} content - Response content
 * @param {string} errorContext - Context for error messages
 * @returns {Object} - Parsed JSON
 */
function parseJsonResponse(content, errorContext) {
  try {
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    return JSON.parse(jsonStr);
  } catch (parseError) {
    console.error(
      `[OpenRouter] Failed to parse ${errorContext} JSON:`,
      parseError,
      content,
    );
    throw new Error(`Failed to parse ${errorContext}. Please try again.`);
  }
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
 * Format experience for resume personalization prompt
 * Uses language-neutral formatting to avoid biasing the AI output language
 */
function formatExperienceForPersonalization(experience) {
  return experience
    .map((exp, i) => {
      return `[${i + 1}] ${exp.position} @ ${exp.company}
${exp.startDate} — ${exp.endDate || "..."}
---
${exp.description}
${exp.achievements?.length ? `+ ${exp.achievements.join("; ")}` : ""}`;
    })
    .join("\n\n");
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

  const promptTemplate = await buildPromptFromTemplate("fit-assessment", {
    vacancy: {
      name: vacancy.name,
      company: vacancy.company,
      keySkills: vacancy.keySkills?.join(", ") || "Not specified",
      experience: vacancy.experience || "Not specified",
      description: stripHtml(vacancy.description).substring(0, 2000),
    },
    resume: {
      title: resume.title,
      skills: resume.skills?.join(", ") || "Not specified",
      experience: formatExperience(resume.experience),
    },
  });

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  console.log(
    "[OpenRouter] Fit assessment response:",
    JSON.stringify(data, null, 2),
  );

  const content = extractContent(data, "fit assessment");
  const result = parseJsonResponse(content, "fit assessment");

  return {
    success: true,
    ...result,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Format personalized experience for cover letter prompt
 */
function formatExperienceForCoverLetter(experience) {
  if (!experience?.length) return "No experience provided";

  return experience
    .map((exp) => {
      const period = exp.endDate
        ? `${exp.startDate} — ${exp.endDate}`
        : `${exp.startDate} — present`;
      return `${exp.position} at ${exp.companyName} (${period})
${exp.description || ""}`;
    })
    .join("\n\n");
}

/**
 * Generate a cover letter for a specific vacancy
 *
 * @param {Object} vacancy - Vacancy data
 * @param {Object} personalizedResume - Personalized resume data (title, keySkills, experience)
 * @param {Object} fitAssessment - Fit assessment from assessFitScore (optional)
 * @param {number} aggressiveness - Aggressiveness level 0.0-1.0 (affects cover letter tone)
 * @returns {Object} - { coverLetter, model, usage }
 */
export async function generateCoverLetter(
  vacancy,
  personalizedResume = null,
  fitAssessment = null,
  aggressiveness = 0.5,
) {
  const settings = await getSettings();
  const baseResume = await getBaseResume();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  if (!baseResume) {
    throw new Error(
      "Resume not configured. Please fill in your resume in Options.",
    );
  }

  // Build contacts string
  const contactTelegram =
    settings.contactTelegram || baseResume.contacts?.telegram || "";
  const contactEmail =
    settings.contactEmail || baseResume.contacts?.email || "";
  const contacts = [contactTelegram, contactEmail].filter(Boolean).join(", ");

  // Build fit section
  const fitSection = fitAssessment
    ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || "N/A"}
Strengths: ${fitAssessment.strengths?.join(", ") || "None identified"}
Gaps: ${fitAssessment.gaps?.join(", ") || "None identified"}`
    : "";

  // Build strategy section
  const strategySection = `
STRATEGY:
- Present candidate as ideal fit for this role
- Mention experience with key required skills: ${vacancy.keySkills?.slice(0, 4).join(", ") || "required technologies"}
- Be confident and specific`;

  // Build strengths hint for structure
  const strengthsHint = fitAssessment?.strengths
    ? ` from: ${fitAssessment.strengths.join(", ")}`
    : "";

  // Format personalized experience (or fall back to base resume)
  const personalizedExperienceFormatted = personalizedResume?.experience?.length
    ? formatExperienceForCoverLetter(personalizedResume.experience)
    : formatExperience(baseResume.experience);

  const personalizedSkills = personalizedResume?.keySkills?.length
    ? personalizedResume.keySkills
    : baseResume.skills || [];

  const personalizedTitle = personalizedResume?.title || baseResume.title || "";

  // Check for custom template
  if (settings.coverLetterTemplate) {
    // Use custom template with simple interpolation
    // For custom templates, we pass personalized data in the resume object
    const customPrompt = interpolate(settings.coverLetterTemplate, {
      vacancy: {
        name: vacancy.name || "",
        company: vacancy.company || "",
        description: stripHtml(vacancy.description) || "",
        keySkills: vacancy.keySkills?.join(", ") || "",
        experience: vacancy.experience || "",
      },
      resume: {
        fullName: baseResume.fullName || "",
        title: personalizedTitle,
        summary: baseResume.summary || "",
        experience: personalizedExperienceFormatted,
        skills: personalizedSkills.join(", "),
      },
      personalized: {
        title: personalizedTitle,
        keySkills: JSON.stringify(personalizedSkills),
        experienceFormatted: personalizedExperienceFormatted,
      },
      aggressiveness: aggressiveness.toFixed(2),
    });

    const data = await callOpenRouter({
      apiKey: settings.openRouterApiKey,
      model: settings.preferredModel,
      messages: [{ role: "user", content: customPrompt }],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const coverLetter = extractContent(data, "cover letter");

    return {
      success: true,
      coverLetter: coverLetter.trim(),
      model: data.model,
      usage: data.usage,
    };
  }

  // Use YAML template
  const promptTemplate = await buildPromptFromTemplate("cover-letter", {
    vacancy: {
      name: vacancy.name,
      company: vacancy.company,
      description: stripHtml(vacancy.description).substring(0, 2000),
      keySkills: vacancy.keySkills?.join(", ") || "Not specified",
    },
    // Keep resume for backward compatibility, but prioritize personalized data
    resume: {
      fullName: baseResume.fullName,
      title: personalizedTitle,
      experience: personalizedExperienceFormatted,
      skills: personalizedSkills.join(", ") || "Not specified",
    },
    // NEW: Personalized resume data (explicit)
    personalized: {
      title: personalizedTitle,
      keySkills: JSON.stringify(personalizedSkills),
      experienceFormatted: personalizedExperienceFormatted,
    },
    // NEW: Aggressiveness level
    aggressiveness: aggressiveness.toFixed(2),
    fitSection,
    contacts,
    salaryExpectation: settings.salaryExpectation || "обсуждается",
    strategySection,
    strengthsHint,
  });

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  const rawContent = extractContent(data, "cover letter");

  // Parse JSON response and extract cover_letter field
  let coverLetter;
  let extraction = null;

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(rawContent);
    coverLetter = parsed.cover_letter;
    extraction = parsed.extraction;

    if (!coverLetter) {
      throw new Error("No cover_letter field in response");
    }
  } catch (parseError) {
    // Fallback: try to extract JSON from markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        coverLetter = parsed.cover_letter;
        extraction = parsed.extraction;
      } catch {
        // Final fallback: use raw content as-is (old behavior)
        console.warn("[OpenRouter] Could not parse JSON, using raw content");
        coverLetter = rawContent;
      }
    } else {
      // No JSON found, use raw content
      console.warn("[OpenRouter] No JSON in response, using raw content");
      coverLetter = rawContent;
    }
  }

  return {
    success: true,
    coverLetter: coverLetter.trim(),
    extraction, // For debugging/validation
    model: data.model,
    usage: data.usage,
  };
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

  // Build fit section
  const fitSection = fitAssessment
    ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || "N/A"}
Gaps: ${fitAssessment.gaps?.join(", ") || "None identified"}
Strengths: ${fitAssessment.strengths?.join(", ") || "None identified"}`
    : "";

  // Build focus instructions
  const focusInstructions = fitAssessment
    ? ` Focus on:
- Highlighting: ${fitAssessment.strengths?.join(", ") || "relevant experience"}
- Addressing gaps: ${fitAssessment.gaps?.join(", ") || "none"}`
    : "";

  const promptTemplate = await buildPromptFromTemplate(
    "resume-personalization",
    {
      vacancy: {
        name: vacancy.name,
        company: vacancy.company,
        keySkills: vacancy.keySkills?.join(", ") || "Not specified",
        experience: vacancy.experience || "Not specified",
        description: stripHtml(vacancy.description).substring(0, 2500),
      },
      resume: {
        fullName: baseResume.fullName,
        title: baseResume.title,
        skills: baseResume.skills?.join(", ") || "Not specified",
        experienceFormatted: formatExperienceForPersonalization(
          baseResume.experience,
        ),
      },
      fitSection,
      aggressiveness: effectiveAggressiveness.toFixed(2),
      focusInstructions,
    },
  );

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  const content = extractContent(data, "resume");
  const result = parseJsonResponse(content, "generated resume");

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

  const promptTemplate = await buildPromptFromTemplate("pdf-parser", {
    pdfText,
  });

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  const content = extractContent(data, "resume parsing");
  const result = parseJsonResponse(content, "AI response");

  return {
    success: true,
    resume: result,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Parse free-form job description text into structured vacancy format
 *
 * @param {string} rawText - Raw job description text
 * @returns {Object} - Structured vacancy { name, company, description, keySkills, experience, salary }
 */
export async function parseUniversalVacancy(rawText) {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  if (!rawText || rawText.trim().length < 20) {
    throw new Error(
      "Job description is too short. Please paste a complete job description.",
    );
  }

  const promptTemplate = await buildPromptFromTemplate(
    "universal-vacancy-parse",
    { rawText: rawText.substring(0, 8000) }, // Limit input to prevent token overflow
  );

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  const content = extractContent(data, "vacancy parsing");
  const result = parseJsonResponse(content, "parsed vacancy");

  return {
    success: true,
    vacancy: {
      name: result.name || "Job Position",
      company: result.company || "Not specified",
      description: result.description || rawText.substring(0, 2000),
      keySkills: result.keySkills || [],
      experience: result.experience || "Not specified",
      salary: result.salary || null,
    },
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Generate a professional, catchy resume title for HH.ru
 *
 * @param {Object} vacancy - Vacancy data
 * @param {Object} personalizedResume - The generated personalized resume
 * @returns {Object} - { success, title }
 */
export async function generateResumeTitle(vacancy, personalizedResume) {
  const settings = await getSettings();

  if (!settings.openRouterApiKey) {
    throw new Error(
      "OpenRouter API key not configured. Please set it in Options.",
    );
  }

  const promptTemplate = await buildPromptFromTemplate("resume-title", {
    vacancy: {
      name: vacancy.name,
      company: vacancy.company,
    },
    resume: {
      keySkills:
        personalizedResume.keySkills?.slice(0, 5).join(", ") || "Not specified",
      recentPosition:
        personalizedResume.experience?.[0]?.position || "Not specified",
      recentCompany: personalizedResume.experience?.[0]?.companyName || "",
    },
  });

  const data = await callOpenRouter({
    apiKey: settings.openRouterApiKey,
    model: settings.preferredModel,
    messages: [{ role: "user", content: promptTemplate.user }],
    temperature: promptTemplate.temperature,
    max_tokens: promptTemplate.max_tokens,
  });

  const title = extractContent(data, "resume title").trim();

  // Clean up the title (remove quotes if AI wrapped it)
  const cleanTitle = title.replace(/^["']|["']$/g, "").trim();

  return {
    success: true,
    title: cleanTitle.substring(0, 50), // Enforce max length
    model: data.model,
    usage: data.usage,
  };
}
