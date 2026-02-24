import { useI18n } from "../../hooks/useI18n";
import styles from "./LanguageToggle.module.css";

const languages = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "es", label: "ES" },
  { code: "de", label: "DE" },
  { code: "fr", label: "FR" },
  { code: "pt", label: "PT" },
] as const;

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className={styles.toggle}>
      {languages.map(({ code, label }) => (
        <button
          key={code}
          className={`${styles.option} ${lang === code ? styles.active : ""}`}
          onClick={() => setLang(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
