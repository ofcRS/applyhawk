/**
 * Core TypeScript types for ApplyHawk
 */

// ============ Resume Types ============

export interface ContactInfo {
  email?: string;
  phone?: string;
  telegram?: string;
  linkedin?: string;
}

export interface Experience {
  company?: string;
  companyName?: string;
  companyDescription?: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  achievements?: string[];
}

export interface Education {
  institution?: string;
  name?: string;
  degree?: string;
  faculty?: string;
  year?: string;
  graduationYear?: string;
}

export interface Resume {
  fullName: string;
  title: string;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  contacts: ContactInfo;
}

export interface PersonalizedResume {
  title: string;
  summary?: string | null;
  experience: Experience[];
  keySkills: string[];
  appliedAggressiveness?: number;
  originalFitScore?: number | null;
}

// ============ Vacancy Types ============

export interface Vacancy {
  id?: string;
  name: string;
  company: string;
  description: string;
  keySkills: string[];
  experience?: string;
  salary?: string | null;
  url?: string;
}

// ============ Fit Assessment Types ============

export interface FitAssessment {
  fitScore: number;
  strengths: string[];
  gaps: string[];
  recommendation?: string;
}

// ============ Settings Types ============

export interface AggressiveFitSettings {
  enabled: boolean;
  minFitScore: number;
  maxAggressiveness: number;
  aggressivenessOverride: number | null;
}

export interface Settings {
  openRouterApiKey: string;
  preferredModel: string;
  defaultHHResumeId?: string;
  coverLetterTemplate?: string;
  contactEmail?: string;
  contactTelegram?: string;
  salaryExpectation?: string;
  aggressiveFit: AggressiveFitSettings;
  adaptJobTitles?: boolean;
}

// ============ AI Response Types ============

export interface AIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AIResponse<T> {
  success: boolean;
  model?: string;
  usage?: AIUsage;
  data?: T;
  error?: string;
}

export interface CoverLetterResult {
  success: boolean;
  coverLetter: string;
  extraction?: unknown;
  model?: string;
  usage?: AIUsage;
}

export interface PersonalizedResumeResult extends PersonalizedResume {
  success: boolean;
  model?: string;
  usage?: AIUsage;
}

export interface FitAssessmentResult extends FitAssessment {
  success: boolean;
  model?: string;
  usage?: AIUsage;
}

export interface ParsedVacancyResult {
  success: boolean;
  vacancy: Vacancy;
  model?: string;
  usage?: AIUsage;
}

export interface ParsedResumeResult {
  success: boolean;
  resume: Resume;
  model?: string;
  usage?: AIUsage;
}

// ============ Storage Interface ============

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// ============ Prompt Types ============

export interface PromptTemplate {
  name: string;
  description?: string;
  system?: string;
  user: string;
  temperature: number;
  max_tokens: number;
}

export interface BuiltPrompt {
  system?: string;
  user: string;
  temperature: number;
  max_tokens: number;
}

// ============ AI Client Configuration ============

export interface AIClientConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AICallOptions {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

// ============ PDF Generator Configuration ============

export interface PDFGeneratorConfig {
  fontUrls?: {
    regular: string;
    bold: string;
  };
}

// ============ Language Detection ============

export type Language = "en" | "ru";
