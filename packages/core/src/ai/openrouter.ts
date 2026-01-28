/**
 * OpenRouter AI Client
 * Reusable AI client that works with both web and extension
 */

import type {
  AICallOptions,
  AIClientConfig,
  AIUsage,
  CoverLetterResult,
  Experience,
  FitAssessment,
  FitAssessmentResult,
  ParsedResumeResult,
  ParsedVacancyResult,
  PersonalizedResumeResult,
  Resume,
  Settings,
  Vacancy,
} from '../types';
import type { BuiltPrompt } from '../prompts';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';

/**
 * Calculate aggressiveness level based on fit score
 */
export function calculateAggressiveness(fitScore: number, override: number | null = null): number {
  if (override !== null) {
    return Math.max(0, Math.min(1, override));
  }
  const aggressiveness = 1 - fitScore * 0.9;
  return Math.round(aggressiveness * 100) / 100;
}

/**
 * Check if vacancy should be skipped based on fit score
 */
export function shouldSkipVacancy(
  fitScore: number,
  minFitScore = 0.15,
  maxAggressiveness = 0.95
): { skip: boolean; reason?: string } {
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
 * Strip HTML tags from text
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format experience array into readable text
 */
export function formatExperience(experience: Experience[] | undefined): string {
  if (!experience?.length) return 'No experience specified';

  return experience
    .map((exp) => {
      const period = exp.endDate
        ? `${exp.startDate} - ${exp.endDate}`
        : `${exp.startDate} - present`;
      const achievements = exp.achievements?.length
        ? `\n  Achievements: ${exp.achievements.join('; ')}`
        : '';
      return `- ${exp.position} at ${exp.companyName || exp.company} (${period})
  ${exp.description || ''}${achievements}`;
    })
    .join('\n');
}

/**
 * Format experience for resume personalization prompt
 */
export function formatExperienceForPersonalization(experience: Experience[]): string {
  return experience
    .map((exp, i) => {
      return `[${i + 1}] ${exp.position} @ ${exp.companyName || exp.company}
${exp.startDate} — ${exp.endDate || '...'}
---
${exp.description || ''}
${exp.achievements?.length ? `+ ${exp.achievements.join('; ')}` : ''}`;
    })
    .join('\n\n');
}

/**
 * Format personalized experience for cover letter prompt
 */
function formatExperienceForCoverLetter(experience: Experience[]): string {
  if (!experience?.length) return 'No experience provided';

  return experience
    .map((exp) => {
      const period = exp.endDate
        ? `${exp.startDate} — ${exp.endDate}`
        : `${exp.startDate} — present`;
      return `${exp.position} at ${exp.companyName || exp.company} (${period})
${exp.description || ''}`;
    })
    .join('\n\n');
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJsonResponse<T>(content: string, errorContext: string): T {
  try {
    const jsonMatch =
      content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    return JSON.parse(jsonStr) as T;
  } catch (parseError) {
    console.error(`[OpenRouter] Failed to parse ${errorContext} JSON:`, parseError, content);
    throw new Error(`Failed to parse ${errorContext}. Please try again.`);
  }
}

/**
 * OpenRouter AI Client class
 */
export class OpenRouterClient {
  private config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = {
      baseUrl: OPENROUTER_API,
      model: DEFAULT_MODEL,
      ...config,
    };
  }

  /**
   * Update client configuration
   */
  configure(config: Partial<AIClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Make an API call to OpenRouter
   */
  async call(options: AICallOptions): Promise<{ content: string; model: string; usage?: AIUsage }> {
    const { messages, temperature = 0.7, max_tokens = 2000, model } = options;

    const response = await fetch(this.config.baseUrl!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || this.config.model,
        temperature,
        max_tokens,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
      usage?: AIUsage;
      error?: { message?: string };
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      if (data.error) {
        throw new Error(`API error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      throw new Error('Empty response from AI model');
    }

    return {
      content,
      model: data.model || this.config.model!,
      usage: data.usage,
    };
  }

  /**
   * Assess how well a candidate matches a job vacancy
   */
  async assessFitScore(
    vacancy: Vacancy,
    resume: Resume,
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>
  ): Promise<FitAssessmentResult> {
    const prompt = await promptBuilder({
      vacancy: {
        name: vacancy.name,
        company: vacancy.company,
        keySkills: vacancy.keySkills?.join(', ') || 'Not specified',
        experience: vacancy.experience || 'Not specified',
        description: stripHtml(vacancy.description).substring(0, 2000),
      },
      resume: {
        title: resume.title,
        skills: resume.skills?.join(', ') || 'Not specified',
        experience: formatExperience(resume.experience),
      },
    });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    const result = parseJsonResponse<FitAssessment>(response.content, 'fit assessment');

    return {
      success: true,
      ...result,
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Generate a personalized resume
   */
  async generatePersonalizedResume(
    baseResume: Resume,
    vacancy: Vacancy,
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>,
    fitAssessment: FitAssessment | null = null,
    aggressiveness: number | null = null,
    settings?: Settings
  ): Promise<PersonalizedResumeResult> {
    if (!baseResume || !baseResume.experience?.length) {
      throw new Error('Base resume with experience not configured.');
    }

    const effectiveAggressiveness =
      aggressiveness ??
      (fitAssessment
        ? calculateAggressiveness(
            fitAssessment.fitScore,
            settings?.aggressiveFit?.aggressivenessOverride ?? null
          )
        : 0.5);

    const fitSection = fitAssessment
      ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || 'N/A'}
Gaps: ${fitAssessment.gaps?.join(', ') || 'None identified'}
Strengths: ${fitAssessment.strengths?.join(', ') || 'None identified'}`
      : '';

    const focusInstructions = fitAssessment
      ? ` Focus on:
- Highlighting: ${fitAssessment.strengths?.join(', ') || 'relevant experience'}
- Addressing gaps: ${fitAssessment.gaps?.join(', ') || 'none'}`
      : '';

    const prompt = await promptBuilder({
      vacancy: {
        name: vacancy.name,
        company: vacancy.company,
        keySkills: vacancy.keySkills?.join(', ') || 'Not specified',
        experience: vacancy.experience || 'Not specified',
        description: stripHtml(vacancy.description).substring(0, 2500),
      },
      resume: {
        fullName: baseResume.fullName,
        title: baseResume.title,
        skills: baseResume.skills?.join(', ') || 'Not specified',
        experienceFormatted: formatExperienceForPersonalization(baseResume.experience),
      },
      fitSection,
      aggressiveness: effectiveAggressiveness.toFixed(2),
      focusInstructions,
    });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    const result = parseJsonResponse<{
      title?: string;
      summary?: string;
      experience?: Experience[];
      keySkills?: string[];
    }>(response.content, 'generated resume');

    return {
      success: true,
      title: result.title || baseResume.title,
      summary: result.summary || null,
      experience: result.experience || [],
      keySkills: result.keySkills || [],
      appliedAggressiveness: effectiveAggressiveness,
      originalFitScore: fitAssessment?.fitScore ?? null,
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Generate a cover letter
   */
  async generateCoverLetter(
    vacancy: Vacancy,
    baseResume: Resume,
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>,
    personalizedResume?: { title?: string; keySkills?: string[]; experience?: Experience[] } | null,
    fitAssessment?: FitAssessment | null,
    aggressiveness = 0.5,
    settings?: Settings
  ): Promise<CoverLetterResult> {
    const contactTelegram = settings?.contactTelegram || baseResume.contacts?.telegram || '';
    const contactEmail = settings?.contactEmail || baseResume.contacts?.email || '';
    const contacts = [contactTelegram, contactEmail].filter(Boolean).join(', ');

    const fitSection = fitAssessment
      ? `
FIT ASSESSMENT:
fitScore: ${fitAssessment.fitScore?.toFixed(2) || 'N/A'}
Strengths: ${fitAssessment.strengths?.join(', ') || 'None identified'}
Gaps: ${fitAssessment.gaps?.join(', ') || 'None identified'}`
      : '';

    const strategySection = `
STRATEGY:
- Present candidate as ideal fit for this role
- Mention experience with key required skills: ${vacancy.keySkills?.slice(0, 4).join(', ') || 'required technologies'}
- Be confident and specific`;

    const strengthsHint = fitAssessment?.strengths
      ? ` from: ${fitAssessment.strengths.join(', ')}`
      : '';

    const personalizedExperienceFormatted = personalizedResume?.experience?.length
      ? formatExperienceForCoverLetter(personalizedResume.experience)
      : formatExperience(baseResume.experience);

    const personalizedSkills = personalizedResume?.keySkills?.length
      ? personalizedResume.keySkills
      : baseResume.skills || [];

    const personalizedTitle = personalizedResume?.title || baseResume.title || '';

    const prompt = await promptBuilder({
      vacancy: {
        name: vacancy.name,
        company: vacancy.company,
        description: stripHtml(vacancy.description).substring(0, 2000),
        keySkills: vacancy.keySkills?.join(', ') || 'Not specified',
      },
      resume: {
        fullName: baseResume.fullName,
        title: personalizedTitle,
        experience: personalizedExperienceFormatted,
        skills: personalizedSkills.join(', ') || 'Not specified',
      },
      personalized: {
        title: personalizedTitle,
        keySkills: JSON.stringify(personalizedSkills),
        experienceFormatted: personalizedExperienceFormatted,
      },
      aggressiveness: aggressiveness.toFixed(2),
      fitSection,
      contacts,
      salaryExpectation: settings?.salaryExpectation || 'negotiable',
      strategySection,
      strengthsHint,
    });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    let coverLetter: string;
    let extraction: unknown = null;

    try {
      const parsed = JSON.parse(response.content) as { cover_letter?: string; extraction?: unknown };
      coverLetter = parsed.cover_letter || response.content;
      extraction = parsed.extraction;
    } catch {
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim()) as { cover_letter?: string; extraction?: unknown };
          coverLetter = parsed.cover_letter || response.content;
          extraction = parsed.extraction;
        } catch {
          coverLetter = response.content;
        }
      } else {
        coverLetter = response.content;
      }
    }

    return {
      success: true,
      coverLetter: coverLetter.trim(),
      extraction,
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Parse a resume from PDF text
   */
  async parseResumePDF(
    pdfText: string,
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>
  ): Promise<ParsedResumeResult> {
    const prompt = await promptBuilder({ pdfText });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    const result = parseJsonResponse<Resume>(response.content, 'resume parsing');

    return {
      success: true,
      resume: result,
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Parse free-form job description into structured vacancy
   */
  async parseUniversalVacancy(
    rawText: string,
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>
  ): Promise<ParsedVacancyResult> {
    if (!rawText || rawText.trim().length < 20) {
      throw new Error('Job description is too short. Please paste a complete job description.');
    }

    const prompt = await promptBuilder({
      rawText: rawText.substring(0, 8000),
    });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    const result = parseJsonResponse<Partial<Vacancy>>(response.content, 'parsed vacancy');

    return {
      success: true,
      vacancy: {
        name: result.name || 'Job Position',
        company: result.company || 'Not specified',
        description: result.description || rawText.substring(0, 2000),
        keySkills: result.keySkills || [],
        experience: result.experience || 'Not specified',
        salary: result.salary || null,
      },
      model: response.model,
      usage: response.usage,
    };
  }

  /**
   * Generate a professional resume title
   */
  async generateResumeTitle(
    vacancy: Vacancy,
    personalizedResume: { keySkills?: string[]; experience?: Experience[] },
    promptBuilder: (vars: Record<string, unknown>) => Promise<BuiltPrompt>
  ): Promise<{ success: boolean; title: string; model?: string; usage?: AIUsage }> {
    const prompt = await promptBuilder({
      vacancy: {
        name: vacancy.name,
        company: vacancy.company,
      },
      resume: {
        keySkills: personalizedResume.keySkills?.slice(0, 5).join(', ') || 'Not specified',
        recentPosition: personalizedResume.experience?.[0]?.position || 'Not specified',
        recentCompany: personalizedResume.experience?.[0]?.companyName || '',
      },
    });

    const response = await this.call({
      messages: [{ role: 'user', content: prompt.user }],
      temperature: prompt.temperature,
      max_tokens: prompt.max_tokens,
    });

    const title = response.content.trim().replace(/^["']|["']$/g, '').trim();

    return {
      success: true,
      title: title.substring(0, 50),
      model: response.model,
      usage: response.usage,
    };
  }
}

/**
 * Create an OpenRouter client instance
 */
export function createAIClient(config: AIClientConfig): OpenRouterClient {
  return new OpenRouterClient(config);
}
