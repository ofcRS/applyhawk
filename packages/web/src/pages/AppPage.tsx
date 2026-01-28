import type {
  CoverLetterResult,
  PersonalizedResume,
  Resume,
  Vacancy,
} from "@applyhawk/core";
import { useCallback, useState } from "react";
import JobInput from "../components/JobInput";
import ResultViewer from "../components/ResultViewer";
import ResumeEditor from "../components/ResumeEditor";
import SettingsPanel from "../components/SettingsPanel";
import { useAI } from "../hooks/useAI";
import { useStorage } from "../hooks/useStorage";
import styles from "./AppPage.module.css";

interface AppPageProps {
  onBack: () => void;
}

type Step = "resume" | "job" | "result";

export default function AppPage({ onBack }: AppPageProps) {
  const { resume, settings, updateResume, updateSettings, isLoaded } =
    useStorage();
  const {
    generatePersonalizedResume,
    generateCoverLetter,
    parseResumePDF,
    isLoading,
    error,
  } = useAI(settings);
  const [isParsingPDF, setIsParsingPDF] = useState(false);

  const [step, setStep] = useState<Step>("resume");
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [personalizedResume, setPersonalizedResume] =
    useState<PersonalizedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(
    null,
  );
  const [showSettings, setShowSettings] = useState(false);

  const handleResumeComplete = useCallback(() => {
    setStep("job");
  }, []);

  const handleParsePDF = useCallback(
    async (pdfText: string): Promise<{ success: boolean; resume: Resume }> => {
      setIsParsingPDF(true);
      try {
        const result = await parseResumePDF(pdfText);
        return result;
      } finally {
        setIsParsingPDF(false);
      }
    },
    [parseResumePDF],
  );

  const handleJobSubmit = useCallback(
    async (parsedVacancy: Vacancy) => {
      setVacancy(parsedVacancy);

      if (!resume) {
        return;
      }

      try {
        // Generate personalized resume
        const personalized = await generatePersonalizedResume(
          resume,
          parsedVacancy,
        );
        setPersonalizedResume(personalized);

        // Generate cover letter
        const letter = await generateCoverLetter(
          parsedVacancy,
          resume,
          personalized,
        );
        setCoverLetter(letter);

        setStep("result");
      } catch (err) {
        console.error("Generation failed:", err);
      }
    },
    [resume, generatePersonalizedResume, generateCoverLetter],
  );

  const handleStartOver = useCallback(() => {
    setStep("job");
    setVacancy(null);
    setPersonalizedResume(null);
    setCoverLetter(null);
  }, []);

  if (!isLoaded) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <div className={styles.logo}>
          <span>🦅</span>
          <span>ApplyHawk</span>
        </div>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️ Settings
        </button>
      </header>

      {/* Progress */}
      <div className={styles.progress}>
        <div
          className={`${styles.progressStep} ${step === "resume" ? styles.active : ""} ${step !== "resume" ? styles.completed : ""}`}
        >
          <span className={styles.progressNumber}>1</span>
          <span className={styles.progressLabel}>Resume</span>
        </div>
        <div className={styles.progressLine} />
        <div
          className={`${styles.progressStep} ${step === "job" ? styles.active : ""} ${step === "result" ? styles.completed : ""}`}
        >
          <span className={styles.progressNumber}>2</span>
          <span className={styles.progressLabel}>Job</span>
        </div>
        <div className={styles.progressLine} />
        <div
          className={`${styles.progressStep} ${step === "result" ? styles.active : ""}`}
        >
          <span className={styles.progressNumber}>3</span>
          <span className={styles.progressLabel}>Result</span>
        </div>
      </div>

      {/* Main Content */}
      <main className={styles.main}>
        {showSettings ? (
          <SettingsPanel
            settings={settings}
            onSave={(newSettings) => {
              updateSettings(newSettings);
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
          />
        ) : (
          <>
            {step === "resume" && (
              <ResumeEditor
                resume={resume}
                onSave={updateResume}
                onContinue={handleResumeComplete}
                onParsePDF={
                  settings.openRouterApiKey ? handleParsePDF : undefined
                }
                isParsingPDF={isParsingPDF}
                isApiKeyConfigured={!!settings.openRouterApiKey}
              />
            )}

            {step === "job" && (
              <JobInput
                apiKey={settings.openRouterApiKey}
                onSubmit={handleJobSubmit}
                onBack={() => setStep("resume")}
                isLoading={isLoading}
                error={error}
              />
            )}

            {step === "result" && vacancy && personalizedResume && (
              <ResultViewer
                vacancy={vacancy}
                personalizedResume={personalizedResume}
                coverLetter={coverLetter}
                baseResume={resume!}
                onStartOver={handleStartOver}
                onEditResume={() => setStep("resume")}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
