import {
  ArrowRight,
  BriefcaseBusiness,
  Chrome,
  FileText,
  Lock,
  Mail,
  Search,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import Button from "../components/common/Button";
import LanguageToggle from "../components/common/LanguageToggle";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./LandingPage.module.css";

export default function LandingPage() {
  const { t } = useI18n();
  const { navigate } = useHashRoute();

  const features = [
    { icon: Sparkles, title: t.featPersonalizationTitle, desc: t.featPersonalizationDesc },
    { icon: Target, title: t.featAssessmentTitle, desc: t.featAssessmentDesc },
    { icon: Mail, title: t.featCoverLetterTitle, desc: t.featCoverLetterDesc },
    { icon: Lock, title: t.featPrivacyTitle, desc: t.featPrivacyDesc },
  ];

  const steps = [
    { num: 1, icon: Upload, title: t.howStep1Title, desc: t.howStep1Desc },
    { num: 2, icon: Search, title: t.howStep2Title, desc: t.howStep2Desc },
    { num: 3, icon: FileText, title: t.howStep3Title, desc: t.howStep3Desc },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoLink}>
          <span className={styles.logoIcon}>
            <BriefcaseBusiness size={18} />
          </span>
          <span className={styles.logoText}>{t.appName}</span>
        </div>
        <div className={styles.headerActions}>
          <LanguageToggle />
          <Button
            size="sm"
            onClick={() => navigate("/app")}
          >
            {t.getStarted}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
          <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>
          <a
            className={styles.heroCta}
            href="#/app"
            onClick={(e) => {
              e.preventDefault();
              navigate("/app");
            }}
          >
            {t.heroCta}
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={20} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <h2 className={styles.sectionLabel}>{t.howItWorksTitle}</h2>
        <div className={styles.steps}>
          {steps.map(({ num, title, desc }) => (
            <div key={num} className={styles.step}>
              <div className={styles.stepNumber}>{num}</div>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.stepDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Extension promo */}
      <section className={styles.promo}>
        <div className={styles.promoCard}>
          <h2 className={styles.promoTitle}>{t.extensionPromoTitle}</h2>
          <p className={styles.promoDesc}>{t.extensionPromoDesc}</p>
          <a
            href="https://github.com/ofcRS/applyhawk"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant="secondary"
              icon={<Chrome size={16} />}
            >
              {t.extensionPromoCta}
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>{t.footerPrivacy}</p>
      </footer>
    </div>
  );
}
