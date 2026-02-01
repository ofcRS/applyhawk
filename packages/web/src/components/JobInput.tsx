import { detectLanguage, getLanguageName } from "@applyhawk/core";
import type { Vacancy } from "@applyhawk/core";
import { useCallback, useState } from "react";
import styles from "./JobInput.module.css";

interface JobInputProps {
  apiKey: string;
  onSubmit: (vacancy: Vacancy) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function JobInput({
  apiKey,
  onSubmit,
  onBack,
  isLoading,
  error,
}: JobInputProps) {
  const [jobText, setJobText] = useState("");
  const detectedLanguage = jobText.length > 50 ? detectLanguage(jobText) : null;

  const handleSubmit = useCallback(async () => {
    if (!jobText.trim()) return;

    // Simple parsing for demo - in production, this would call the AI
    const lines = jobText.split("\n").filter((l) => l.trim());
    const title = lines[0] || "Job Position";

    // Extract skills by looking for common patterns
    const skillPatterns =
      /(?:skills?|technologies?|stack|requirements?|требовани[яе]|навыки|стек)[\s:]*(.+)/gi;
    const skillMatches = [...jobText.matchAll(skillPatterns)];
    const skills = skillMatches.flatMap((m) =>
      m[1]
        .split(/[,;•\-]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 50),
    );

    // Create basic vacancy structure
    const vacancy: Vacancy = {
      name: title.substring(0, 100),
      company: "Company", // Would be extracted by AI
      description: jobText,
      keySkills: skills.slice(0, 15),
      experience: "Not specified",
    };

    await onSubmit(vacancy);
  }, [jobText, onSubmit]);

  const isApiKeyMissing = !apiKey;

  return (
    <div className={styles.container}>
      <h2>Paste Job Description</h2>
      <p className={styles.subtitle}>
        Copy the job posting you want to apply for and paste it below. AI will
        analyze it and personalize your resume.
      </p>

      {isApiKeyMissing && (
        <div className={styles.warning}>
          <span>⚠️</span>
          <div>
            <strong>API Key Required</strong>
            <p>
              Please configure your OpenRouter API key in Settings to use AI
              features.
            </p>
          </div>
        </div>
      )}

      <div className="field">
        <div className={styles.labelRow}>
          <label className="label">Job Description *</label>
          {detectedLanguage && (
            <span className={styles.languageTag}>
              {getLanguageName(detectedLanguage)} detected
            </span>
          )}
        </div>
        <textarea
          className={`input textarea ${styles.jobTextarea}`}
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste the full job description here...

Example:
Senior Software Engineer at TechCorp

We're looking for an experienced engineer to join our team...

Requirements:
- 5+ years of experience with JavaScript/TypeScript
- Strong knowledge of React and Node.js
- Experience with cloud platforms (AWS/GCP)
..."
          rows={15}
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className={styles.error}>
          <span>❌</span>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={isLoading}
        >
          ← Back to Resume
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!jobText.trim() || isLoading || isApiKeyMissing}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              Generating...
            </>
          ) : (
            "Generate Personalized Resume →"
          )}
        </button>
      </div>
    </div>
  );
}
