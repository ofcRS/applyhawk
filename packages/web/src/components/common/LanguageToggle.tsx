import { useI18n } from "../../hooks/useI18n";
import styles from "./LanguageToggle.module.css";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className={styles.toggle}>
      <button
        className={`${styles.option} ${lang === "en" ? styles.active : ""}`}
        onClick={() => setLang("en")}
      >
        EN
      </button>
      <button
        className={`${styles.option} ${lang === "ru" ? styles.active : ""}`}
        onClick={() => setLang("ru")}
      >
        RU
      </button>
    </div>
  );
}
