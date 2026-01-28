import { useState, useCallback, useRef } from 'react';
import type { Resume, Experience, Education } from '@applyhawk/core';
import * as pdfjsLib from 'pdfjs-dist';
import styles from './ResumeEditor.module.css';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface ResumeEditorProps {
  resume: Resume | null;
  onSave: (resume: Partial<Resume>) => Promise<void>;
  onContinue: () => void;
  onParsePDF?: (pdfText: string) => Promise<{ success: boolean; resume: Resume }>;
  isParsingPDF?: boolean;
}

export default function ResumeEditor({ resume, onSave, onContinue, onParsePDF, isParsingPDF = false }: ResumeEditorProps) {
  const [formData, setFormData] = useState<Resume>(resume || {
    fullName: '',
    title: '',
    summary: '',
    experience: [],
    education: [],
    skills: [],
    contacts: { email: '', phone: '', telegram: '', linkedin: '' },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  };

  const handlePdfUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onParsePDF) return;

    setPdfError(null);

    try {
      const pdfText = await extractTextFromPdf(file);

      if (pdfText.length < 100) {
        setPdfError('Could not extract text from PDF. Make sure it contains selectable text.');
        return;
      }

      const result = await onParsePDF(pdfText);

      if (result.success && result.resume) {
        setFormData({
          fullName: result.resume.fullName || '',
          title: result.resume.title || '',
          summary: result.resume.summary || '',
          experience: result.resume.experience || [],
          education: result.resume.education || [],
          skills: result.resume.skills || [],
          contacts: result.resume.contacts || { email: '', phone: '', telegram: '', linkedin: '' },
        });
      }
    } catch (err) {
      console.error('PDF parsing failed:', err);
      setPdfError(err instanceof Error ? err.message : 'Failed to parse PDF');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onParsePDF]);

  const handleChange = useCallback((field: keyof Resume, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleContactChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contacts: { ...prev.contacts, [field]: value },
    }));
  }, []);

  const handleExperienceChange = useCallback((index: number, field: keyof Experience, value: string) => {
    setFormData(prev => {
      const newExp = [...prev.experience];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, experience: newExp };
    });
  }, []);

  const addExperience = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        { company: '', position: '', startDate: '', endDate: '', description: '' },
      ],
    }));
  }, []);

  const removeExperience = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  }, []);

  const handleEducationChange = useCallback((index: number, field: keyof Education, value: string) => {
    setFormData(prev => {
      const newEdu = [...prev.education];
      newEdu[index] = { ...newEdu[index], [field]: value };
      return { ...prev, education: newEdu };
    });
  }, []);

  const addEducation = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        { institution: '', degree: '', year: '' },
      ],
    }));
  }, []);

  const removeEducation = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSkillsChange = useCallback((value: string) => {
    const skills = value.split(',').map(s => s.trim()).filter(Boolean);
    handleChange('skills', skills);
  }, [handleChange]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave]);

  const handleContinue = useCallback(async () => {
    await handleSave();
    onContinue();
  }, [handleSave, onContinue]);

  const isValid = formData.fullName && formData.experience.length > 0;

  return (
    <div className={styles.editor}>
      <h2>Your Resume</h2>
      <p className={styles.subtitle}>Fill in your information once, personalize for every job.</p>

      {/* PDF Upload */}
      {onParsePDF && (
        <section className={styles.uploadSection}>
          <div className={styles.uploadBox}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              disabled={isParsingPDF}
              className={styles.fileInput}
              id="pdf-upload"
            />
            <label htmlFor="pdf-upload" className={styles.uploadLabel}>
              {isParsingPDF ? (
                <>
                  <span className={styles.uploadSpinner} />
                  <span>Parsing your resume...</span>
                </>
              ) : (
                <>
                  <span className={styles.uploadIcon}>📄</span>
                  <span>Upload existing resume (PDF)</span>
                  <span className={styles.uploadHint}>AI will extract your information automatically</span>
                </>
              )}
            </label>
          </div>
          {pdfError && <p className={styles.uploadError}>{pdfError}</p>}
          <div className={styles.divider}>
            <span>or fill manually</span>
          </div>
        </section>
      )}

      {/* Basic Info */}
      <section className={styles.section}>
        <h3>Basic Information</h3>
        <div className={styles.grid}>
          <div className="field">
            <label className="label">Full Name *</label>
            <input
              type="text"
              className="input"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="field">
            <label className="label">Professional Title</label>
            <input
              type="text"
              className="input"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </div>
        </div>
        <div className="field">
          <label className="label">Professional Summary</label>
          <textarea
            className="input textarea"
            value={formData.summary || ''}
            onChange={(e) => handleChange('summary', e.target.value)}
            placeholder="Brief overview of your experience and career goals..."
            rows={3}
          />
        </div>
      </section>

      {/* Contacts */}
      <section className={styles.section}>
        <h3>Contact Information</h3>
        <div className={styles.grid}>
          <div className="field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={formData.contacts.email || ''}
              onChange={(e) => handleContactChange('email', e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div className="field">
            <label className="label">Phone</label>
            <input
              type="tel"
              className="input"
              value={formData.contacts.phone || ''}
              onChange={(e) => handleContactChange('phone', e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
          <div className="field">
            <label className="label">LinkedIn</label>
            <input
              type="text"
              className="input"
              value={formData.contacts.linkedin || ''}
              onChange={(e) => handleContactChange('linkedin', e.target.value)}
              placeholder="linkedin.com/in/johndoe"
            />
          </div>
          <div className="field">
            <label className="label">Telegram</label>
            <input
              type="text"
              className="input"
              value={formData.contacts.telegram || ''}
              onChange={(e) => handleContactChange('telegram', e.target.value)}
              placeholder="@johndoe"
            />
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Work Experience *</h3>
          <button type="button" className="btn btn-secondary" onClick={addExperience}>
            + Add Position
          </button>
        </div>
        {formData.experience.length === 0 && (
          <p className={styles.empty}>No work experience added yet. Click "Add Position" to start.</p>
        )}
        {formData.experience.map((exp, index) => (
          <div key={index} className={styles.experienceCard}>
            <div className={styles.cardHeader}>
              <span>Position {index + 1}</span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeExperience(index)}
              >
                Remove
              </button>
            </div>
            <div className={styles.grid}>
              <div className="field">
                <label className="label">Company</label>
                <input
                  type="text"
                  className="input"
                  value={exp.company || exp.companyName || ''}
                  onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="field">
                <label className="label">Position</label>
                <input
                  type="text"
                  className="input"
                  value={exp.position}
                  onChange={(e) => handleExperienceChange(index, 'position', e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="field">
                <label className="label">Start Date</label>
                <input
                  type="month"
                  className="input"
                  value={exp.startDate?.substring(0, 7) || ''}
                  onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">End Date</label>
                <input
                  type="month"
                  className="input"
                  value={exp.endDate?.substring(0, 7) || ''}
                  onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                  placeholder="Leave empty if current"
                />
              </div>
            </div>
            <div className="field">
              <label className="label">Description & Achievements</label>
              <textarea
                className="input textarea"
                value={exp.description || ''}
                onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                placeholder="- Developed features that improved user engagement by 25%&#10;- Led migration to microservices architecture&#10;- Mentored 3 junior developers"
                rows={4}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className={styles.section}>
        <h3>Skills</h3>
        <div className="field">
          <label className="label">Technical Skills (comma-separated)</label>
          <input
            type="text"
            className="input"
            value={formData.skills.join(', ')}
            onChange={(e) => handleSkillsChange(e.target.value)}
            placeholder="JavaScript, React, Node.js, Python, AWS, Docker"
          />
        </div>
      </section>

      {/* Education */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Education</h3>
          <button type="button" className="btn btn-secondary" onClick={addEducation}>
            + Add Education
          </button>
        </div>
        {formData.education.map((edu, index) => (
          <div key={index} className={styles.educationCard}>
            <div className={styles.cardHeader}>
              <span>Education {index + 1}</span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => removeEducation(index)}
              >
                Remove
              </button>
            </div>
            <div className={styles.grid}>
              <div className="field">
                <label className="label">Institution</label>
                <input
                  type="text"
                  className="input"
                  value={edu.institution || edu.name || ''}
                  onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                  placeholder="Stanford University"
                />
              </div>
              <div className="field">
                <label className="label">Degree</label>
                <input
                  type="text"
                  className="input"
                  value={edu.degree || edu.faculty || ''}
                  onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                  placeholder="B.S. Computer Science"
                />
              </div>
              <div className="field">
                <label className="label">Year</label>
                <input
                  type="text"
                  className="input"
                  value={edu.year || edu.graduationYear || ''}
                  onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                  placeholder="2020"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={!isValid || isSaving}
        >
          Continue to Job →
        </button>
      </div>
    </div>
  );
}
