import type { Settings } from "@applyhawk/core";
import { useCallback, useEffect, useState } from "react";
import styles from "./SettingsPanel.module.css";

interface SettingsPanelProps {
  settings: Settings;
  onSave: (settings: Partial<Settings>) => void;
  onClose: () => void;
}

interface OpenRouterModel {
  id: string;
  name: string;
  contextLength: number;
  pricing: { prompt?: string; completion?: string };
  isRecommended: boolean;
}

const RECOMMENDED_MODELS = [
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "google/gemini-pro-1.5",
  "google/gemini-flash-1.5",
  "meta-llama/llama-3.1-70b-instruct",
  "qwen/qwen-2.5-72b-instruct",
];

type ModelCategory = "recommended" | "all" | "budget";

export default function SettingsPanel({
  settings,
  onSave,
  onClose,
}: SettingsPanelProps) {
  const [formData, setFormData] = useState({
    openRouterApiKey: settings.openRouterApiKey || "",
    preferredModel: settings.preferredModel || "anthropic/claude-sonnet-4",
    contactEmail: settings.contactEmail || "",
    contactTelegram: settings.contactTelegram || "",
    salaryExpectation: settings.salaryExpectation || "",
    aggressiveness: settings.aggressiveFit?.aggressivenessOverride !== null
      ? Math.round((settings.aggressiveFit?.aggressivenessOverride ?? 0.5) * 100)
      : 50,
  });

  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategory, setCurrentCategory] =
    useState<ModelCategory>("recommended");

  // Fetch models from OpenRouter API
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true);
      setModelError(null);
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid API response format");
        }

        const models: OpenRouterModel[] = data.data
          .filter(
            (model: { architecture?: { modality?: string }; id: string }) => {
              const modality = model.architecture?.modality || "";
              return (
                (modality.includes("text") || !modality) &&
                !model.id.includes("embed")
              );
            },
          )
          .map(
            (model: {
              id: string;
              name?: string;
              context_length?: number;
              pricing?: { prompt?: string; completion?: string };
            }) => ({
              id: model.id,
              name: formatModelName(model.name || model.id),
              contextLength: model.context_length || 0,
              pricing: model.pricing || {},
              isRecommended: RECOMMENDED_MODELS.includes(model.id),
            }),
          )
          .sort((a: OpenRouterModel, b: OpenRouterModel) => {
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return a.name.localeCompare(b.name);
          });

        setAllModels(models);
      } catch (err) {
        console.error("Failed to load models:", err);
        setModelError(
          err instanceof Error ? err.message : "Failed to load models",
        );
      } finally {
        setIsLoadingModels(false);
      }
    }
    loadModels();
  }, []);

  const formatModelName = (name: string): string => {
    return name
      .replace(
        /^(anthropic|openai|google|meta-llama|qwen|mistralai|cohere|deepseek|microsoft)\//,
        "",
      )
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPrice = (pricing: { prompt?: string }): string => {
    const promptPrice = Number.parseFloat(pricing?.prompt || "0");
    if (promptPrice === 0) return "Free";
    const perMillion = promptPrice * 1000000;
    if (perMillion < 0.01) return "<$0.01/1M";
    if (perMillion < 1) return `$${perMillion.toFixed(2)}/1M`;
    return `$${perMillion.toFixed(0)}/1M`;
  };

  const formatContext = (length: number): string => {
    if (!length) return "N/A";
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
    if (length >= 1000) return `${Math.round(length / 1000)}K`;
    return `${length}`;
  };

  const filteredModels = allModels.filter((model) => {
    const matchesSearch =
      !searchQuery ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesCategory = true;
    if (currentCategory === "recommended") {
      matchesCategory = model.isRecommended;
    } else if (currentCategory === "budget") {
      const price = Number.parseFloat(model.pricing?.prompt || "0");
      matchesCategory = price < 0.000001;
    }

    return matchesSearch && matchesCategory;
  });

  const handleChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(() => {
    const { aggressiveness, ...rest } = formData;
    onSave({
      ...rest,
      aggressiveFit: {
        enabled: true,
        minFitScore: 0.15,
        maxAggressiveness: 0.95,
        aggressivenessOverride: aggressiveness / 100,
      },
    });
  }, [formData, onSave]);

  const handleModelSelect = useCallback((modelId: string) => {
    setFormData((prev) => ({ ...prev, preferredModel: modelId }));
  }, []);

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
              onChange={(e) => handleChange("openRouterApiKey", e.target.value)}
              placeholder="sk-or-..."
            />
            <p className={styles.hint}>
              Get your API key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="field">
            <label className="label">AI Model</label>

            {/* Category buttons */}
            <div className={styles.modelCategories}>
              <button
                type="button"
                className={`${styles.categoryBtn} ${currentCategory === "recommended" ? styles.active : ""}`}
                onClick={() => setCurrentCategory("recommended")}
              >
                Top
              </button>
              <button
                type="button"
                className={`${styles.categoryBtn} ${currentCategory === "all" ? styles.active : ""}`}
                onClick={() => setCurrentCategory("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.categoryBtn} ${currentCategory === "budget" ? styles.active : ""}`}
                onClick={() => setCurrentCategory("budget")}
              >
                Budget
              </button>
            </div>

            {/* Search input */}
            <input
              type="text"
              className="input"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: "0.75rem" }}
            />

            {/* Model list */}
            <div className={styles.modelList}>
              {isLoadingModels ? (
                <div className={styles.modelLoading}>
                  <span className={styles.modelSpinner} />
                  <span>Loading models...</span>
                </div>
              ) : modelError ? (
                <div className={styles.modelError}>
                  <span>Failed to load models: {modelError}</span>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className={styles.modelEmpty}>
                  <span>No models found</span>
                </div>
              ) : (
                filteredModels.slice(0, 50).map((model) => (
                  <div
                    key={model.id}
                    className={`${styles.modelItem} ${formData.preferredModel === model.id ? styles.selected : ""}`}
                    onClick={() => handleModelSelect(model.id)}
                  >
                    <div className={styles.modelRadio} />
                    <div className={styles.modelContent}>
                      <div className={styles.modelName}>{model.name}</div>
                      <div className={styles.modelMeta}>
                        <span className={styles.modelTag}>
                          {formatPrice(model.pricing)}
                        </span>
                        <span className={styles.modelTag}>
                          {formatContext(model.contextLength)} ctx
                        </span>
                        {model.isRecommended && (
                          <span
                            className={`${styles.modelTag} ${styles.recommended}`}
                          >
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Aggressiveness slider */}
          <div className="field">
            <div className={styles.sliderHeader}>
              <label className="label">Resume Personalization Level</label>
              <span className={styles.sliderValue}>{formData.aggressiveness}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.aggressiveness}
              onChange={(e) => setFormData(prev => ({ ...prev, aggressiveness: parseInt(e.target.value, 10) }))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
            <p className={styles.hint}>
              Higher values make AI adapt your resume more to match job requirements.
              Lower values keep it closer to your original experience.
            </p>
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
                onChange={(e) => handleChange("contactEmail", e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="field">
              <label className="label">Telegram</label>
              <input
                type="text"
                className="input"
                value={formData.contactTelegram}
                onChange={(e) =>
                  handleChange("contactTelegram", e.target.value)
                }
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
              onChange={(e) =>
                handleChange("salaryExpectation", e.target.value)
              }
              placeholder="$150,000 - $180,000"
            />
          </div>
        </section>

        {/* Privacy Note */}
        <section className={styles.privacyNote}>
          <h4>🔒 Privacy</h4>
          <p>
            Your data is stored locally in your browser. We don't have access to
            your resume, job applications, or API key. All AI processing happens
            through your own OpenRouter account.
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
