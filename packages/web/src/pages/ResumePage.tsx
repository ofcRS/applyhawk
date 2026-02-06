import type { Education, Experience, Resume } from "@applyhawk/core";
import * as pdfjsLib from "pdfjs-dist";
import { ArrowRight, FileUp, Plus, Save } from "lucide-react";
import { useCallback, useContext, useRef, useState } from "react";
import Button from "../components/common/Button";
import { InputField, TextareaField } from "../components/common/Input";
import { StorageContext } from "../contexts/StorageContext";
import { useAI } from "../hooks/useAI";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./ResumePage.module.css";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.149/pdf.worker.min.mjs";

function normalizeToMonth(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 7);
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return "";
}

export default function ResumePage() {
  const { t } = useI18n();
  const { navigate } = useHashRoute();
  const { resume, settings, updateResume } = useContext(StorageContext);
  const { parseResumePDF, isConfigured } = useAI(settings);

  const [formData, setFormData] = useState<Resume>(
    resume || {
      fullName: "",
      title: "",
      summary: "",
      experience: [],
      education: [],
      skills: [],
      contacts: { email: "", phone: "", telegram: "", linkedin: "" },
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
  const handleChange = useCallback((field: keyof Resume, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleContactChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contacts: { ...prev.contacts, [field]: value },
    }));
  }, []);

  // Experience
  const handleExperienceChange = useCallback(
    (index: number, field: keyof Experience, value: string) => {
      setFormData((prev) => {
        const newExp = [...prev.experience];
        newExp[index] = { ...newExp[index], [field]: value };
        return { ...prev, experience: newExp };
      });
    },
    [],
  );

  const addExperience = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: "", position: "", startDate: "", endDate: "", description: "" },
      ],
    }));
  }, []);

  const removeExperience = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  }, []);

  // Education
  const handleEducationChange = useCallback(
    (index: number, field: keyof Education, value: string) => {
      setFormData((prev) => {
        const newEdu = [...prev.education];
        newEdu[index] = { ...newEdu[index], [field]: value };
        return { ...prev, education: newEdu };
      });
    },
    [],
  );

  const addEducation = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      education: [...prev.education, { institution: "", degree: "", year: "" }],
    }));
  }, []);

  const removeEducation = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  }, []);

  // Skills
  const handleSkillsChange = useCallback(
    (value: string) => {
      const skills = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      handleChange("skills", skills);
    },
    [handleChange],
  );

  // PDF upload
  const handlePdfUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setPdfError(null);
      setIsParsingPdf(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          fullText += `${pageText}\n`;
        }
        fullText = fullText.trim();

        if (fullText.length < 100) {
          setPdfError("Could not extract text from PDF. Make sure it contains selectable text.");
          return;
        }

        const result = await parseResumePDF(fullText);
        if (result.success && result.resume) {
          setFormData({
            fullName: result.resume.fullName || "",
            title: result.resume.title || "",
            summary: result.resume.summary || "",
            experience: result.resume.experience || [],
            education: result.resume.education || [],
            skills: result.resume.skills || [],
            contacts: result.resume.contacts || {
              email: "",
              phone: "",
              telegram: "",
              linkedin: "",
            },
          });
        }
      } catch (err) {
        console.error("PDF parsing failed:", err);
        setPdfError(err instanceof Error ? err.message : "Failed to parse PDF");
      } finally {
        setIsParsingPdf(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [parseResumePDF],
  );

  // Save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateResume(formData);
    } finally {
      setIsSaving(false);
    }
  }, [formData, updateResume]);

  const handleContinue = useCallback(async () => {
    await handleSave();
    navigate("/app");
  }, [handleSave, navigate]);

  const isValid = formData.fullName && formData.experience.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t.resumeTitle}</h1>
        <p className={styles.subtitle}>{t.resumeSubtitle}</p>
      </div>

      {/* PDF Upload */}
      <section className={styles.uploadSection}>
        {!isConfigured && (
          <div className={styles.apiKeyWarning}>
            <span>
              <FileUp size={16} />
            </span>
            <div>
              <strong>{t.noApiKeyTitle}</strong>
              <p>{t.apiKeyRequiredPdf}</p>
            </div>
          </div>
        )}
        <div className={styles.uploadBox}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            disabled={isParsingPdf || !isConfigured}
            className={styles.fileInput}
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className={`${styles.uploadLabel} ${!isConfigured ? styles.uploadLabelDisabled : ""}`}
          >
            {isParsingPdf ? (
              <>
                <span className={styles.uploadSpinner} />
                <span>{t.parsingPdf}</span>
              </>
            ) : (
              <>
                <span className={styles.uploadIcon}>
                  <FileUp size={20} />
                </span>
                <span>{t.uploadPdf}</span>
                <span className={styles.uploadHint}>
                  {isConfigured ? t.uploadPdfHint : t.apiKeyRequiredPdf}
                </span>
              </>
            )}
          </label>
        </div>
        {pdfError && <p className={styles.uploadError}>{pdfError}</p>}
        <div className={styles.divider}>
          <span>{t.orFillManually}</span>
        </div>
      </section>

      {/* Basic Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.basicInfo}</h2>
        <div className={styles.grid}>
          <InputField
            label={t.fullName}
            required
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="John Doe"
          />
          <InputField
            label={t.professionalTitle}
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Senior Software Engineer"
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <TextareaField
            label={t.professionalSummary}
            value={formData.summary || ""}
            onChange={(e) => handleChange("summary", e.target.value)}
            placeholder="Brief overview of your experience and career goals..."
            rows={3}
          />
        </div>
      </section>

      {/* Contacts */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.contactInfo}</h2>
        <div className={styles.grid}>
          <InputField
            type="email"
            label={t.email}
            value={formData.contacts.email || ""}
            onChange={(e) => handleContactChange("email", e.target.value)}
            placeholder="john@example.com"
          />
          <InputField
            type="tel"
            label={t.phone}
            value={formData.contacts.phone || ""}
            onChange={(e) => handleContactChange("phone", e.target.value)}
            placeholder="+1 234 567 8900"
          />
          <InputField
            label={t.linkedin}
            value={formData.contacts.linkedin || ""}
            onChange={(e) => handleContactChange("linkedin", e.target.value)}
            placeholder="linkedin.com/in/johndoe"
          />
          <InputField
            label={t.telegram}
            value={formData.contacts.telegram || ""}
            onChange={(e) => handleContactChange("telegram", e.target.value)}
            placeholder="@johndoe"
          />
        </div>
      </section>

      {/* Experience */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.workExperience} *</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={addExperience}
          >
            {t.addPosition}
          </Button>
        </div>
        {formData.experience.length === 0 && (
          <p className={styles.empty}>{t.noExperience}</p>
        )}
        {formData.experience.map((exp, index) => (
          <div key={index} className={styles.entryCard}>
            <div className={styles.entryHeader}>
              <span>
                {t.position} {index + 1}
              </span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeExperience(index)}
              >
                {t.remove}
              </button>
            </div>
            <div className={styles.grid}>
              <InputField
                label={t.company}
                value={exp.company || exp.companyName || ""}
                onChange={(e) =>
                  handleExperienceChange(index, "company", e.target.value)
                }
                placeholder="Acme Inc."
              />
              <InputField
                label={t.position}
                value={exp.position}
                onChange={(e) =>
                  handleExperienceChange(index, "position", e.target.value)
                }
                placeholder="Software Engineer"
              />
              <InputField
                type="month"
                label={t.startDate}
                value={normalizeToMonth(exp.startDate)}
                onChange={(e) =>
                  handleExperienceChange(index, "startDate", e.target.value)
                }
              />
              <InputField
                type="month"
                label={t.endDate}
                value={normalizeToMonth(exp.endDate)}
                onChange={(e) =>
                  handleExperienceChange(index, "endDate", e.target.value)
                }
              />
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <TextareaField
                label={t.descriptionAchievements}
                value={exp.description || ""}
                onChange={(e) =>
                  handleExperienceChange(index, "description", e.target.value)
                }
                rows={3}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.skills}</h2>
        <InputField
          label={`${t.skills} (comma-separated)`}
          value={formData.skills.join(", ")}
          onChange={(e) => handleSkillsChange(e.target.value)}
          placeholder={t.skillsPlaceholder}
        />
      </section>

      {/* Education */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t.education}</h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={addEducation}
          >
            {t.addEducation}
          </Button>
        </div>
        {formData.education.map((edu, index) => (
          <div key={index} className={styles.entryCard}>
            <div className={styles.entryHeader}>
              <span>
                {t.education} {index + 1}
              </span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeEducation(index)}
              >
                {t.remove}
              </button>
            </div>
            <div className={styles.grid}>
              <InputField
                label={t.institution}
                value={edu.institution || edu.name || ""}
                onChange={(e) =>
                  handleEducationChange(index, "institution", e.target.value)
                }
                placeholder="Stanford University"
              />
              <InputField
                label={t.degree}
                value={edu.degree || edu.faculty || ""}
                onChange={(e) =>
                  handleEducationChange(index, "degree", e.target.value)
                }
                placeholder="B.S. Computer Science"
              />
              <InputField
                label={t.year}
                value={edu.year || edu.graduationYear || ""}
                onChange={(e) =>
                  handleEducationChange(index, "year", e.target.value)
                }
                placeholder="2020"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          variant="secondary"
          onClick={handleSave}
          loading={isSaving}
          icon={<Save size={14} />}
        >
          {isSaving ? t.saving : t.save}
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!isValid || isSaving}
          icon={<ArrowRight size={14} />}
        >
          {t.continueToWorkspace}
        </Button>
      </div>
    </div>
  );
}
