import { useState, useCallback } from 'react';
import type { Settings } from '@applyhawk/core';
import styles from './SettingsPanel.module.css';

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
  onClose: () => void;
}

const POPULAR_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4 (Recommended)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Budget)' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
];

export default function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [formData, setFormData] = useState({
    openRouterApiKey: settings.openRouterApiKey || '',
    preferredModel: settings.preferredModel || 'anthropic/claude-sonnet-4',
    contactEmail: settings.contactEmail || '',
    contactTelegram: settings.contactTelegram || '',
    salaryExpectation: settings.salaryExpectation || '',
  });

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(formData);
  }, [formData, onSave]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Settings</h2>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div className={styles.content}>
        {/* API Key */}
        <section className={styles.section}>
          <h3>AI Configuration</h3>
          <div className="field">
            <label className="label">OpenRouter API Key *</label>
            <input
              type="password"
              className="input"
              value={formData.openRouterApiKey}
              onChange={(e) => handleChange('openRouterApiKey', e.target.value)}
              placeholder="sk-or-..."
            />
            <p className={styles.hint}>
              Get your API key at{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="field">
            <label className="label">AI Model</label>
            <select
              className="input"
              value={formData.preferredModel}
              onChange={(e) => handleChange('preferredModel', e.target.value)}
            >
              {POPULAR_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Contact Info */}
        <section className={styles.section}>
          <h3>Contact Info for Cover Letters</h3>
          <p className={styles.sectionNote}>
            This information will be included in generated cover letters.
          </p>

          <div className={styles.grid}>
            <div className="field">
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={formData.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="field">
              <label className="label">Telegram</label>
              <input
                type="text"
                className="input"
                value={formData.contactTelegram}
                onChange={(e) => handleChange('contactTelegram', e.target.value)}
                placeholder="@johndoe"
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Salary Expectation</label>
            <input
              type="text"
              className="input"
              value={formData.salaryExpectation}
              onChange={(e) => handleChange('salaryExpectation', e.target.value)}
              placeholder="$150,000 - $180,000"
            />
          </div>
        </section>

        {/* Privacy Note */}
        <section className={styles.privacyNote}>
          <h4>🔒 Privacy</h4>
          <p>
            Your data is stored locally in your browser. We don't have access to your
            resume, job applications, or API key. All AI processing happens through
            your own OpenRouter account.
          </p>
        </section>
      </div>

      <div className={styles.actions}>
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!formData.openRouterApiKey}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
