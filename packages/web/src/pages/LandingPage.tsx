import LanguageToggle from "../components/common/LanguageToggle";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./LandingPage.module.css";

const PLATFORMS = ["LinkedIn", "Indeed", "Glassdoor", "Greenhouse", "Lever", "HH.ru"];

const FEATURE_ACCENTS = ["\u2726", "\u25C8", "\u25C7", "\u25C9"];

export default function LandingPage() {
  const { t } = useI18n();
  const { navigate } = useHashRoute();

  const features = [
    { title: t.featPersonalizationTitle, desc: t.featPersonalizationDesc },
    { title: t.featAssessmentTitle, desc: t.featAssessmentDesc },
    { title: t.featCoverLetterTitle, desc: t.featCoverLetterDesc },
    { title: t.featPrivacyTitle, desc: t.featPrivacyDesc },
  ];

  const steps = [
    { title: t.howStep1Title, desc: t.howStep1Desc },
    { title: t.howStep2Title, desc: t.howStep2Desc },
    { title: t.howStep3Title, desc: t.howStep3Desc },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoLink}>
          <span className={styles.logoMark}>A</span>
          <span className={styles.logoText}>{t.appName}</span>
        </div>
        <div className={styles.headerActions}>
          <LanguageToggle />
          <a
            href="#/app"
            className={styles.btnPrimary}
            onClick={(e) => {
              e.preventDefault();
              navigate("/app");
            }}
          >
            {t.getStarted} <span className={styles.btnArrow}>&rarr;</span>
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>
            <div className={styles.heroLabelDot} />
            {t.heroLabel}
          </div>

          <h1 className={styles.heroTitle}>
            {t.heroTitle}
            <br />
            <em className={styles.heroTitleHighlight}>{t.heroTitleHighlight}</em>
            {" for every\u00A0job"}
          </h1>

          <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>

          <div className={styles.heroCtaGroup}>
            <a
              href="#/app"
              className={styles.btnPrimary}
              onClick={(e) => {
                e.preventDefault();
                navigate("/app");
              }}
            >
              {t.heroCta} <span className={styles.btnArrow}>&rarr;</span>
            </a>
            <a
              href="https://github.com/ofcRS/applyhawk"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              {t.heroGithub} <span className={styles.btnArrow}>&rarr;</span>
            </a>
          </div>

          <div className={styles.heroStats}>
            <div>
              <div className={styles.heroStatValue}>{t.heroStat1Value}</div>
              <div className={styles.heroStatLabel}>{t.heroStat1Label}</div>
            </div>
            <div>
              <div className={styles.heroStatValue}>{t.heroStat2Value}</div>
              <div className={styles.heroStatLabel}>{t.heroStat2Label}</div>
            </div>
            <div>
              <div className={styles.heroStatValue}>{t.heroStat3Value}</div>
              <div className={styles.heroStatLabel}>{t.heroStat3Label}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
            <span key={i} className={styles.tickerItem}>
              <span className={styles.tickerDot}>&bull;</span>
              {" "}{platform}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>01</span>
          <h2 className={styles.sectionTitle}>{t.featSectionTitle}</h2>
        </div>

        <div className={styles.featuresGrid}>
          {features.map(({ title, desc }, i) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIndex}>
                Feature {String(i + 1).padStart(2, "0")}
              </div>
              <div className={styles.featureAccent}>{FEATURE_ACCENTS[i]}</div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>02</span>
          <h2 className={styles.sectionTitle}>{t.howItWorksTitle}</h2>
        </div>

        <div className={styles.steps}>
          {steps.map(({ title, desc }, i) => (
            <div key={title} className={styles.step}>
              <div className={styles.stepNumber}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.stepDesc}>{desc}</p>
              {i < steps.length - 1 && <div className={styles.stepConnector} />}
            </div>
          ))}
        </div>
      </section>

      {/* Extension promo */}
      <section className={styles.promo}>
        <div className={styles.promoCard}>
          <div className={styles.promoContent}>
            <div className={styles.promoBadge}>{t.extensionPromoBadge}</div>
            <h2 className={styles.promoTitle}>{t.extensionPromoTitle}</h2>
            <p className={styles.promoDesc}>{t.extensionPromoDesc}</p>
            <a
              href="https://github.com/ofcRS/applyhawk"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnSecondary}
            >
              {t.extensionPromoCta} <span className={styles.btnArrow}>&rarr;</span>
            </a>
          </div>

          <div className={styles.promoVisual}>
            {["LinkedIn", "Indeed", "Glassdoor", "Greenhouse"].map(
              (platform, i) => (
                <div key={platform} className={styles.promoPlatform}>
                  <div
                    className={
                      i === 0
                        ? styles.promoPlatformDot
                        : styles.promoPlatformDotDim
                    }
                  />
                  {platform}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>{t.footerPrivacy}</span>
          <div className={styles.footerLinks}>
            <a
              href="#/privacy"
              className={styles.footerLink}
              onClick={(e) => {
                e.preventDefault();
                navigate("/privacy");
              }}
            >
              Privacy Policy
            </a>
            <a
              href="https://github.com/ofcRS/applyhawk"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
