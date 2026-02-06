import { useCallback, useEffect, useRef, useState } from "react";
import LanguageToggle from "../components/common/LanguageToggle";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./LandingPage.module.css";

const PLATFORMS = ["LinkedIn", "Indeed", "Glassdoor", "Greenhouse", "Lever", "HH.ru"];
const PROMO_PLATFORMS = ["LinkedIn", "Indeed", "Glassdoor", "Greenhouse"];

function useScrollReveal(threshold = 0.15) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const refs = useRef<Record<string, Element>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  const getObserver = useCallback(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const key = entry.target.getAttribute("data-reveal");
              if (key) {
                setRevealed((prev) => ({ ...prev, [key]: true }));
                observerRef.current?.unobserve(entry.target);
              }
            }
          }
        },
        { threshold, rootMargin: "0px 0px -50px 0px" },
      );
    }
    return observerRef.current;
  }, [threshold]);

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const setRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el && !refs.current[key]) {
        refs.current[key] = el;
        el.setAttribute("data-reveal", key);
        getObserver().observe(el);
      }
    },
    [getObserver],
  );

  const isRevealed = useCallback(
    (key: string) => !!revealed[key],
    [revealed],
  );

  return { setRef, isRevealed };
}

export default function LandingPage() {
  const { t } = useI18n();
  const { navigate } = useHashRoute();
  const { setRef, isRevealed } = useScrollReveal();
  const [activePromoIndex, setActivePromoIndex] = useState(0);
  const promoRevealed = isRevealed("promo");

  useEffect(() => {
    if (!promoRevealed) return;
    const id = setInterval(() => {
      setActivePromoIndex((prev) => (prev + 1) % PROMO_PLATFORMS.length);
    }, 2000);
    return () => clearInterval(id);
  }, [promoRevealed]);

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
            <span className={styles.heroTitleHighlight}>{t.heroTitleHighlight}</span>
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
      <section
        ref={setRef("features")}
        className={`${styles.features} ${styles.revealSection} ${isRevealed("features") ? styles.revealed : ""}`}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>01</span>
          <h2 className={styles.sectionTitle}>{t.featSectionTitle}</h2>
        </div>

        <div className={styles.featuresGrid}>
          {features.map(({ title, desc }, i) => (
            <div
              key={title}
              className={`${styles.featureCard} ${isRevealed("features") ? styles.featureCardVisible : ""}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        ref={setRef("howItWorks")}
        className={`${styles.howItWorks} ${styles.revealSection} ${isRevealed("howItWorks") ? styles.revealed : ""}`}
      >
        <div className={styles.sectionHeader}>
          <span className={styles.sectionNumber}>02</span>
          <h2 className={styles.sectionTitle}>{t.howItWorksTitle}</h2>
        </div>

        <div className={styles.steps}>
          {steps.map(({ title, desc }, i) => (
            <div
              key={title}
              className={`${styles.step} ${isRevealed("howItWorks") ? styles.stepVisible : ""}`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
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
      <section
        ref={setRef("promo")}
        className={`${styles.promo} ${styles.revealSection} ${isRevealed("promo") ? styles.revealed : ""}`}
      >
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
            {PROMO_PLATFORMS.map((platform, i) => (
              <div
                key={platform}
                className={`${styles.promoPlatform} ${
                  i === activePromoIndex
                    ? styles.promoPlatformActive
                    : styles.promoPlatformInactive
                }`}
              >
                <div className={styles.promoPlatformDot} />
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        ref={setRef("footer")}
        className={`${styles.footer} ${styles.revealSection} ${isRevealed("footer") ? styles.revealed : ""}`}
      >
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
