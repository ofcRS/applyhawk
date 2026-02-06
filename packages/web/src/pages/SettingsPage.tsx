import type { Settings } from "@applyhawk/core";
import { Lock, Shield } from "lucide-react";
import { useCallback, useContext, useEffect, useState } from "react";
import Button from "../components/common/Button";
import { InputField } from "../components/common/Input";
import { StorageContext } from "../contexts/StorageContext";
import { useI18n } from "../hooks/useI18n";
import styles from "./SettingsPage.module.css";

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

function formatModelName(name: string): string {
  return name
    .replace(
      /^(anthropic|openai|google|meta-llama|qwen|mistralai|cohere|deepseek|microsoft)\//,
      "",
    )
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatPrice(pricing: { prompt?: string }): string {
  const promptPrice = Number.parseFloat(pricing?.prompt || "0");
  if (promptPrice === 0) return "Free";
  const perMillion = promptPrice * 1000000;
  if (perMillion < 0.01) return "<$0.01/1M";
  if (perMillion < 1) return `$${perMillion.toFixed(2)}/1M`;
  return `$${perMillion.toFixed(0)}/1M`;
}

function formatContext(length: number): string {
  if (!length) return "N/A";
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M`;
  if (length >= 1000) return `${Math.round(length / 1000)}K`;
  return `${length}`;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const { settings, updateSettings } = useContext(StorageContext);

  const [formData, setFormData] = useState({
    openRouterApiKey: settings.openRouterApiKey || "",
    preferredModel: settings.preferredModel || "anthropic/claude-sonnet-4",
    contactEmail: settings.contactEmail || "",
    contactTelegram: settings.contactTelegram || "",
    salaryExpectation: settings.salaryExpectation || "",
    aggressiveness:
      settings.aggressiveFit?.aggressivenessOverride !== null
        ? Math.round(
            (settings.aggressiveFit?.aggressivenessOverride ?? 0.5) * 100,
          )
        : 50,
    adaptJobTitles: settings.adaptJobTitles ?? false,
  });

  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategory, setCurrentCategory] =
    useState<ModelCategory>("recommended");

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
    const { aggressiveness, adaptJobTitles, ...rest } = formData;
    const updated: Partial<Settings> = {
      ...rest,
      aggressiveFit: {
        enabled: true,
        minFitScore: 0.15,
        maxAggressiveness: 0.95,
        aggressivenessOverride: aggressiveness / 100,
      },
      adaptJobTitles,
    };
    updateSettings(updated);
  }, [formData, updateSettings]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t.settingsTitle}</h1>

      {/* AI Configuration */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.aiConfig}</h2>
        <p className={styles.sectionNote}>{t.apiKeyHint}{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            openrouter.ai/keys
          </a>
        </p>

        <div className={styles.fieldGroup}>
          <InputField
            type="password"
            label={t.apiKeyLabel}
            required
            value={formData.openRouterApiKey}
            onChange={(e) => handleChange("openRouterApiKey", e.target.value)}
            placeholder="sk-or-..."
          />

          {/* Model picker */}
          <div>
            <span className={styles.sliderLabel}>{t.modelLabel}</span>

            <div className={styles.modelCategories}>
              {(["recommended", "all", "budget"] as ModelCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.categoryBtn} ${currentCategory === cat ? styles.categoryBtnActive : ""}`}
                  onClick={() => setCurrentCategory(cat)}
                >
                  {cat === "recommended"
                    ? t.modelCategoryTop
                    : cat === "all"
                      ? t.modelCategoryAll
                      : t.modelCategoryBudget}
                </button>
              ))}
            </div>

            <InputField
              placeholder={t.modelSearchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className={styles.modelList}>
              {isLoadingModels ? (
                <div className={styles.modelLoading}>
                  <span className={styles.modelSpinner} />
                  {t.loadingModels}
                </div>
              ) : modelError ? (
                <div className={styles.modelError}>{modelError}</div>
              ) : filteredModels.length === 0 ? (
                <div className={styles.modelEmpty}>{t.noModelsFound}</div>
              ) : (
                filteredModels.slice(0, 50).map((model) => (
                  <div
                    key={model.id}
                    className={`${styles.modelItem} ${formData.preferredModel === model.id ? styles.modelItemSelected : ""}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredModel: model.id,
                      }))
                    }
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
                            className={`${styles.modelTag} ${styles.modelTagRecommended}`}
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
          <div>
            <div className={styles.sliderHeader}>
              <span className={styles.sliderLabel}>
                {t.personalizationLevelLabel}
              </span>
              <span className={styles.sliderValue}>
                {formData.aggressiveness}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.aggressiveness}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  aggressiveness: Number.parseInt(e.target.value, 10),
                }))
              }
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>{t.conservative}</span>
              <span>{t.aggressive}</span>
            </div>
            <p className={styles.hint}>{t.personalizationHint}</p>
          </div>

          {/* Adapt Job Titles */}
          <div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={formData.adaptJobTitles}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    adaptJobTitles: e.target.checked,
                  }))
                }
              />
              <span>{t.adaptJobTitles}</span>
            </label>
            <p className={styles.hint}>{t.adaptJobTitlesHint}</p>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t.contactForCoverLetters}</h2>
        <p className={styles.sectionNote}>{t.contactForCoverLettersNote}</p>

        <div className={styles.grid}>
          <InputField
            type="email"
            label={t.email}
            value={formData.contactEmail}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            placeholder="john@example.com"
          />
          <InputField
            label={t.telegram}
            value={formData.contactTelegram}
            onChange={(e) => handleChange("contactTelegram", e.target.value)}
            placeholder="@johndoe"
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <InputField
            label={t.salaryExpectation}
            value={formData.salaryExpectation}
            onChange={(e) => handleChange("salaryExpectation", e.target.value)}
            placeholder="$150,000 - $180,000"
          />
        </div>
      </section>

      {/* Privacy */}
      <div className={styles.privacyNote}>
        <div className={styles.privacyTitle}>
          <Shield size={16} />
          {t.privacyTitle}
        </div>
        <p className={styles.privacyText}>{t.privacyNote}</p>
      </div>

      {/* Save */}
      <div className={styles.actions}>
        <Button
          onClick={handleSave}
          disabled={!formData.openRouterApiKey}
          icon={<Lock size={14} />}
        >
          {t.saveSettings}
        </Button>
      </div>
    </div>
  );
}
