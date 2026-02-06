import {
  createAIClient,
  createPromptLoader,
  detectLanguage,
} from "@applyhawk/core";
import type {
  CoverLetterResult,
  FitAssessment,
  FitAssessmentResult,
  ParsedResumeResult,
  PersonalizedResume,
  Resume,
  Settings,
  Vacancy,
} from "@applyhawk/core";
import { useCallback, useMemo, useState } from "react";

const promptLoader = createPromptLoader({
  baseUrl: "/prompts/",
  defaultLanguage: "en",
  useLanguageSubdirs: true,
});

export function useAI(settings: Settings) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => {
    if (!settings.openRouterApiKey) return null;
    return createAIClient({
      apiKey: settings.openRouterApiKey,
      model: settings.preferredModel,
    });
  }, [settings.openRouterApiKey, settings.preferredModel]);

  const parseVacancy = useCallback(
    async (rawText: string): Promise<Vacancy> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(rawText);
        const result = await client.parseUniversalVacancy(rawText, (vars) =>
          promptLoader.buildPromptFromTemplate(
            "universal-vacancy-parse",
            vars,
            language,
          ),
        );
        return result.vacancy;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to parse job description";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const assessFitScore = useCallback(
    async (vacancy: Vacancy, resume: Resume): Promise<FitAssessmentResult> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(vacancy.description);
        const result = await client.assessFitScore(vacancy, resume, (vars) =>
          promptLoader.buildPromptFromTemplate(
            "fit-assessment",
            vars,
            language,
          ),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to assess fit score";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  const generatePersonalizedResume = useCallback(
    async (
      resume: Resume,
      vacancy: Vacancy,
      fitAssessment?: FitAssessment | null,
    ): Promise<PersonalizedResume> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(vacancy.description);
        const result = await client.generatePersonalizedResume(
          resume,
          vacancy,
          (vars) =>
            promptLoader.buildPromptFromTemplate(
              "resume-personalization",
              vars,
              language,
            ),
          fitAssessment || null,
          null, // aggressiveness (auto-calculate from settings)
          settings,
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to generate personalized resume";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, settings],
  );

  const generateCoverLetter = useCallback(
    async (
      vacancy: Vacancy,
      baseResume: Resume,
      personalizedResume?: PersonalizedResume | null,
      fitAssessment?: FitAssessment | null,
    ): Promise<CoverLetterResult> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(vacancy.description);
        const aggressiveness =
          settings.aggressiveFit?.aggressivenessOverride ?? 0.5;
        const result = await client.generateCoverLetter(
          vacancy,
          baseResume,
          (vars) =>
            promptLoader.buildPromptFromTemplate(
              "cover-letter",
              vars,
              language,
            ),
          personalizedResume,
          fitAssessment || null,
          aggressiveness,
          settings,
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to generate cover letter";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client, settings],
  );

  const parseResumePDF = useCallback(
    async (pdfText: string): Promise<ParsedResumeResult> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(pdfText);
        const result = await client.parseResumePDF(pdfText, (vars) =>
          promptLoader.buildPromptFromTemplate("pdf-parser", vars, language),
        );
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to parse resume PDF";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [client],
  );

  return {
    parseVacancy,
    assessFitScore,
    generatePersonalizedResume,
    generateCoverLetter,
    parseResumePDF,
    isLoading,
    error,
    isConfigured: !!client,
  };
}
