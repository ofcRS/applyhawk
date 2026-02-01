import {
  createAIClient,
  createPromptLoader,
  detectLanguage,
} from "@applyhawk/core";
import type {
  CoverLetterResult,
  ParsedResumeResult,
  PersonalizedResume,
  Resume,
  Settings,
  Vacancy,
} from "@applyhawk/core";
import { useCallback, useMemo, useState } from "react";

// Create prompt loader for web (loads from /prompts/ directory)
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

  const generatePersonalizedResume = useCallback(
    async (resume: Resume, vacancy: Vacancy): Promise<PersonalizedResume> => {
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
          null, // fitAssessment
          null, // aggressiveness (auto-calculate)
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
    ): Promise<CoverLetterResult> => {
      if (!client) {
        throw new Error("Please configure your OpenRouter API key in Settings");
      }

      setIsLoading(true);
      setError(null);

      try {
        const language = detectLanguage(vacancy.description);
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
          null, // fitAssessment
          0.5, // aggressiveness
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
    generatePersonalizedResume,
    generateCoverLetter,
    parseResumePDF,
    isLoading,
    error,
    isConfigured: !!client,
  };
}
