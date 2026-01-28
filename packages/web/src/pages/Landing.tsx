import styles from './Landing.module.css';

interface LandingProps {
  onGetStarted: () => void;
}

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className={styles.landing}>
      {/* Header */}
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <div className={styles.logo}>
              <span className={styles.logoIcon}>🦅</span>
              <span className={styles.logoText}>ApplyHawk</span>
            </div>
            <nav className={styles.nav}>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <button className="btn btn-primary" onClick={onGetStarted}>
                Try It Free
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Your Resume,{' '}
              <span className={styles.heroTitleHighlight}>Personalized</span>{' '}
              for Every Job
            </h1>
            <p className={styles.heroSubtitle}>
              AI-powered resume optimization that rewrites your experience to match each
              job description. Get more interviews with tailored applications.
            </p>
            <div className={styles.heroCta}>
              <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
                Start Personalizing Free
              </button>
              <p className={styles.heroCtaNote}>
                No account needed. Bring your own OpenRouter API key.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Why ApplyHawk?</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🎯</div>
              <h3>Targeted Personalization</h3>
              <p>
                AI rewrites your experience descriptions using the exact terminology from
                each job posting. Same achievements, better framing.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📝</div>
              <h3>Cover Letters That Work</h3>
              <p>
                Generate professional cover letters that highlight your most relevant
                experience. No more generic templates.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📄</div>
              <h3>PDF Export</h3>
              <p>
                Download your personalized resume as a professionally formatted PDF.
                Ready to submit.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Privacy First</h3>
              <p>
                Your data stays on your device. We don't store your resume or job
                applications. Bring your own API key.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={styles.howItWorks}>
        <div className="container">
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Enter Your Resume</h3>
              <p>Fill in your experience, skills, and education once. Or import from PDF.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Paste Job Description</h3>
              <p>Copy any job posting and paste it. AI detects language automatically.</p>
            </div>
            <div className={styles.stepArrow}>→</div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Get Personalized Content</h3>
              <p>AI rewrites your resume and generates a cover letter. Download or copy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2>Ready to Land More Interviews?</h2>
            <p>Start personalizing your resume for every job application.</p>
            <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <span className={styles.logoIcon}>🦅</span>
              <span>ApplyHawk</span>
            </div>
            <p className={styles.footerNote}>
              Built with ❤️ for job seekers everywhere. Your data, your privacy.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
