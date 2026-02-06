import { detectLanguage, generatePdfResume, getLanguageName } from "@applyhawk/core";
import type {
  CoverLetterResult,
  FitAssessment,
  PDFGeneratorConfig,
  PersonalizedResume,
  Vacancy,
} from "@applyhawk/core";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Clipboard,
  Download,
  FileText,
  Key,
  Mail,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useContext, useState } from "react";
import Button from "../components/common/Button";
import Spinner from "../components/common/Spinner";
import { StorageContext } from "../contexts/StorageContext";
import { useAI } from "../hooks/useAI";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./WorkspacePage.module.css";

const PDF_CONFIG: PDFGeneratorConfig = {
  fontUrls: {
    regular:
      "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/hinted/ttf/NotoSerif-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/hinted/ttf/NotoSerif-Bold.ttf",
  },
};

type WorkspaceStep = "input" | "parsing" | "assessed" | "generating" | "complete";

export default function WorkspacePage() {
  const { t } = useI18n();
  const { navigate } = useHashRoute();
  const { resume, settings } = useContext(StorageContext);
  const ai = useAI(settings);

  const [step, setStep] = useState<WorkspaceStep>("input");
  const [jobText, setJobText] = useState("");
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [fitAssessment, setFitAssessment] = useState<FitAssessment | null>(null);
  const [personalizedResume, setPersonalizedResume] = useState<PersonalizedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterResult | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "cover-letter">("resume");
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectedLanguage = jobText.length > 50 ? detectLanguage(jobText) : null;

  // Step 1: Analyze job
  const handleAnalyze = useCallback(async () => {
    if (!jobText.trim() || !resume) return;

    setError(null);
    setStep("parsing");

    try {
      const parsedVacancy = await ai.parseVacancy(jobText);
      setVacancy(parsedVacancy);

      const fitResult = await ai.assessFitScore(parsedVacancy, resume);
      setFitAssessment(fitResult);
      setStep("assessed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("input");
    }
  }, [jobText, resume, ai]);

  // Step 2: Generate resume + cover letter
  const handleGenerate = useCallback(async () => {
    if (!vacancy || !resume) return;

    setError(null);
    setStep("generating");

    try {
      const genResume = await ai.generatePersonalizedResume(
        resume,
        vacancy,
        fitAssessment,
      );
      setPersonalizedResume(genResume);

      const genCover = await ai.generateCoverLetter(
        vacancy,
        resume,
        genResume,
        fitAssessment,
      );
      setCoverLetter(genCover);

      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStep("assessed");
    }
  }, [vacancy, resume, fitAssessment, ai]);

  // Reset
  const handleNewJob = useCallback(() => {
    setStep("input");
    setJobText("");
    setVacancy(null);
    setFitAssessment(null);
    setPersonalizedResume(null);
    setCoverLetter(null);
    setActiveTab("resume");
    setError(null);
  }, []);

  // PDF download
  const handleDownloadPdf = useCallback(async () => {
    if (!personalizedResume || !resume) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generatePdfResume(personalizedResume, resume, PDF_CONFIG);
      const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_${resume.fullName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [personalizedResume, resume]);

  // Copy
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  // No API key → onboarding
  if (!ai.isConfigured) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t.workspaceTitle}</h1>
        <div className={styles.onboarding}>
          <div className={styles.onboardingIcon}>
            <Key size={24} />
          </div>
          <h2 className={styles.onboardingTitle}>{t.noApiKeyTitle}</h2>
          <p className={styles.onboardingDesc}>{t.noApiKeyDesc}</p>
          <Button onClick={() => navigate("/app/settings")}>
            {t.navSettings}
          </Button>
          <a
            className={styles.onboardingLink}
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.noApiKeyLink}
          </a>
        </div>
      </div>
    );
  }

  // Loading states
  if (step === "parsing" || step === "generating") {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t.workspaceTitle}</h1>
        <div className={styles.loadingState}>
          <Spinner size="lg" />
          <p className={styles.loadingText}>
            {step === "parsing" ? t.analyzing : t.generating}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t.workspaceTitle}</h1>

      {error && (
        <div className={styles.error}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Step 1: Job input */}
      {step === "input" && (
        <div className={styles.inputSection}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {t.pasteJobDesc}
          </p>
          <div className={styles.textareaWrapper}>
            <textarea
              className={styles.textarea}
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder={t.jobPlaceholder}
              rows={12}
            />
          </div>
          <div className={styles.inputFooter}>
            <span className={styles.langBadge}>
              {detectedLanguage && (
                <>
                  {getLanguageName(detectedLanguage)} {t.languageDetected}
                </>
              )}
            </span>
            <div className={styles.analyzeActions}>
              <Button
                onClick={handleAnalyze}
                disabled={!jobText.trim() || !resume}
                icon={<Search size={14} />}
              >
                {t.analyzeBtn}
              </Button>
            </div>
          </div>
          {!resume?.fullName && (
            <div className={styles.error} style={{ marginTop: "0.75rem" }}>
              <AlertCircle size={16} />
              {t.resumeRequired}
              {" "}
              <a
                href="#/app/resume"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/app/resume");
                }}
              >
                {t.navResume}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Fit assessment */}
      {step === "assessed" && fitAssessment && vacancy && (
        <div className={styles.fitSection}>
          <div className={styles.fitCard}>
            <div className={styles.fitHeader}>
              <FitGauge score={fitAssessment.fitScore} label={t.fitScoreLabel} />
              <div className={styles.fitDetails}>
                <h2 className={styles.fitTitle}>
                  {vacancy.name} — {vacancy.company}
                </h2>
                <div className={styles.fitLists}>
                  <div>
                    <div className={`${styles.fitListTitle} ${styles.fitListTitleGreen}`}>
                      {t.strengthsLabel}
                    </div>
                    <ul className={styles.fitList}>
                      {fitAssessment.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className={`${styles.fitListTitle} ${styles.fitListTitleAmber}`}>
                      {t.gapsLabel}
                    </div>
                    <ul className={styles.fitList}>
                      {fitAssessment.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {fitAssessment.recommendation && (
                  <p className={styles.fitRecommendation}>
                    {fitAssessment.recommendation}
                  </p>
                )}
              </div>
            </div>
            <div className={styles.fitActions}>
              <Button
                onClick={handleGenerate}
                icon={<ArrowRight size={14} />}
              >
                {t.generateBtn}
              </Button>
              <Button
                variant="secondary"
                onClick={handleNewJob}
                icon={<RefreshCw size={14} />}
              >
                {t.newJob}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "complete" && personalizedResume && vacancy && (
        <div className={styles.resultSection}>
          <div className={styles.resultHeader}>
            <div className={styles.resultInfo}>
              <h2>
                {t.tailoredFor}: {vacancy.name}
              </h2>
              <p className={styles.resultSubtitle}>{vacancy.company}</p>
            </div>
            <div className={styles.resultActions}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNewJob}
                icon={<RefreshCw size={14} />}
              >
                {t.newJob}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === "resume" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("resume")}
            >
              <FileText size={14} />
              {t.resumeTab}
            </button>
            <button
              className={`${styles.tab} ${activeTab === "cover-letter" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("cover-letter")}
            >
              <Mail size={14} />
              {t.coverLetterTab}
            </button>
          </div>

          {/* Resume tab */}
          {activeTab === "resume" && (
            <div className={styles.resumePreview}>
              <div className={styles.sectionCard}>
                <h3>{personalizedResume.title}</h3>
                {personalizedResume.summary && (
                  <p className={styles.summary}>{personalizedResume.summary}</p>
                )}
              </div>

              <div className={styles.sectionCard}>
                <h3>{t.keySkills}</h3>
                <div className={styles.skillTags}>
                  {personalizedResume.keySkills.map((skill, i) => (
                    <span key={i} className={styles.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {personalizedResume.experience.map((exp, i) => (
                <div key={i} className={styles.sectionCard}>
                  <div className={styles.expHeader}>
                    <div>
                      <h4>{exp.position}</h4>
                      <p className={styles.expCompany}>
                        {exp.companyName || exp.company}
                      </p>
                    </div>
                    <span className={styles.expDates}>
                      {exp.startDate} — {exp.endDate || t.present}
                    </span>
                  </div>
                  <div className={styles.expDescription}>
                    {exp.description?.split("\n").map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}

              <div className={styles.downloadSection}>
                <Button
                  onClick={handleDownloadPdf}
                  loading={isGeneratingPdf}
                  icon={<Download size={14} />}
                >
                  {isGeneratingPdf ? t.generatingPdf : t.downloadPdf}
                </Button>
              </div>
            </div>
          )}

          {/* Cover letter tab */}
          {activeTab === "cover-letter" && (
            <div>
              {coverLetter ? (
                <>
                  <div className={styles.coverLetter}>
                    <div className={styles.letterText}>
                      {coverLetter.coverLetter.split("\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
                  </div>
                  <div className={styles.copySection}>
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(coverLetter.coverLetter)}
                      icon={copied ? <Check size={14} /> : <Clipboard size={14} />}
                    >
                      {copied ? t.copied : t.copyToClipboard}
                    </Button>
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <p>Cover letter generation failed. Please try again.</p>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {personalizedResume.appliedAggressiveness !== undefined && (
            <div className={styles.stats}>
              <span>
                {t.personalizationLevel}:{" "}
                <strong>
                  {Math.round(personalizedResume.appliedAggressiveness * 100)}%
                </strong>
              </span>
              {fitAssessment && (
                <>
                  <span style={{ color: "var(--text-tertiary)" }}>|</span>
                  <span>
                    {t.fitScoreLabel}:{" "}
                    <strong>{Math.round(fitAssessment.fitScore * 100)}%</strong>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** SVG radial gauge for fit score */
function FitGauge({ score, label }: { score: number; label: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score, 0), 1);
  const offset = circumference * (1 - pct);

  const color =
    pct >= 0.7
      ? "var(--success)"
      : pct >= 0.4
        ? "var(--warning)"
        : "var(--error)";

  return (
    <div className={styles.gaugeWrapper}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={radius} className={styles.gaugeCircleBg} />
        <circle
          cx="45"
          cy="45"
          r={radius}
          className={styles.gaugeCircle}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={styles.gaugeText}>
        <span className={styles.gaugeScore} style={{ color }}>
          {Math.round(pct * 100)}%
        </span>
        <span className={styles.gaugeLabel}>{label}</span>
      </div>
    </div>
  );
}
