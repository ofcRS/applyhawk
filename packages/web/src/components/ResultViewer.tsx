import { generatePdfResume } from "@applyhawk/core";
import type {
  CoverLetterResult,
  PDFGeneratorConfig,
  PersonalizedResume,
  Resume,
  Vacancy,
} from "@applyhawk/core";
import { useCallback, useState } from "react";
import styles from "./ResultViewer.module.css";

// Noto Serif fonts from jsDelivr CDN (support Cyrillic)
const PDF_CONFIG: PDFGeneratorConfig = {
  fontUrls: {
    regular:
      "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/hinted/ttf/NotoSerif-Regular.ttf",
    bold: "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSerif/hinted/ttf/NotoSerif-Bold.ttf",
  },
};

interface ResultViewerProps {
  vacancy: Vacancy;
  personalizedResume: PersonalizedResume;
  coverLetter: CoverLetterResult | null;
  baseResume: Resume;
  onStartOver: () => void;
  onEditResume: () => void;
}

type Tab = "resume" | "cover-letter";

export default function ResultViewer({
  vacancy,
  personalizedResume,
  coverLetter,
  baseResume,
  onStartOver,
  onEditResume,
}: ResultViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("resume");
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfBytes = await generatePdfResume(
        personalizedResume,
        baseResume,
        PDF_CONFIG,
      );
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Resume_${baseResume.fullName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [personalizedResume, baseResume]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Your Personalized Content</h2>
          <p className={styles.subtitle}>
            Tailored for: <strong>{vacancy.name}</strong> at {vacancy.company}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary" onClick={onEditResume}>
            Edit Resume
          </button>
          <button className="btn btn-primary" onClick={onStartOver}>
            New Application
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "resume" ? styles.active : ""}`}
          onClick={() => setActiveTab("resume")}
        >
          📄 Personalized Resume
        </button>
        <button
          className={`${styles.tab} ${activeTab === "cover-letter" ? styles.active : ""}`}
          onClick={() => setActiveTab("cover-letter")}
        >
          ✉️ Cover Letter
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === "resume" && (
          <div className={styles.resumeView}>
            <div className={styles.sectionCard}>
              <h3>{personalizedResume.title}</h3>
              {personalizedResume.summary && (
                <p className={styles.summary}>{personalizedResume.summary}</p>
              )}
            </div>

            <div className={styles.sectionCard}>
              <h4>Key Skills</h4>
              <div className={styles.skills}>
                {personalizedResume.keySkills.map((skill, i) => (
                  <span key={i} className={styles.skill}>
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
                    <p className={styles.company}>
                      {exp.companyName || exp.company}
                    </p>
                  </div>
                  <span className={styles.dates}>
                    {exp.startDate} — {exp.endDate || "Present"}
                  </span>
                </div>
                <div className={styles.description}>
                  {exp.description?.split("\n").map((line, j) => (
                    <p key={j}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            <div className={styles.downloadSection}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <span className={styles.spinner} />
                    Generating PDF...
                  </>
                ) : (
                  "📥 Download as PDF"
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "cover-letter" && (
          <div className={styles.coverLetterView}>
            {coverLetter ? (
              <>
                <div className={styles.letterContent}>
                  {coverLetter.coverLetter.split("\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                <div className={styles.copySection}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleCopy(coverLetter.coverLetter)}
                  >
                    {copied ? "✓ Copied!" : "📋 Copy to Clipboard"}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <p>Cover letter generation failed. Please try again.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      {personalizedResume.appliedAggressiveness !== undefined && (
        <div className={styles.stats}>
          <span>
            Personalization level:{" "}
            <strong>
              {Math.round(personalizedResume.appliedAggressiveness * 100)}%
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
