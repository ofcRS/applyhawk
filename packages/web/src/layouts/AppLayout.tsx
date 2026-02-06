import { FileText, Layers, Settings } from "lucide-react";
import { useContext } from "react";
import type { ReactNode } from "react";
import LanguageToggle from "../components/common/LanguageToggle";
import { StorageContext } from "../contexts/StorageContext";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./AppLayout.module.css";

const NAV_ITEMS = [
  { path: "/app", icon: Layers, labelKey: "navWorkspace" as const },
  { path: "/app/resume", icon: FileText, labelKey: "navResume" as const },
  { path: "/app/settings", icon: Settings, labelKey: "navSettings" as const },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { route, navigate } = useHashRoute();
  const { t } = useI18n();
  const { resume } = useContext(StorageContext);

  const isResumeConfigured =
    resume?.fullName && (resume?.experience?.length ?? 0) > 0;

  return (
    <div className={styles.layout}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <a
          href="#/"
          className={styles.logo}
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
        >
          <img src="/favicon.png" alt="" className={styles.logoIcon} />
          <span className={styles.logoText}>{t.appName}</span>
        </a>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
            const isActive =
              path === "/app" ? route === "/app" : route.startsWith(path);
            return (
              <a
                key={path}
                href={`#${path}`}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(path);
                }}
              >
                <Icon className={styles.navIcon} size={18} />
                {t[labelKey]}
              </a>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.resumeStatus}>
            <span
              className={`${styles.statusDot} ${isResumeConfigured ? styles.statusDotGreen : styles.statusDotYellow}`}
            />
            {isResumeConfigured ? t.resumeConfigured : t.resumeNotConfigured}
          </div>
          <LanguageToggle />
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.content}>{children}</main>

      {/* Mobile bottom tabs */}
      <nav className={styles.bottomTabs}>
        {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
          const isActive =
            path === "/app" ? route === "/app" : route.startsWith(path);
          return (
            <a
              key={path}
              href={`#${path}`}
              className={`${styles.bottomTab} ${isActive ? styles.bottomTabActive : ""}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(path);
              }}
            >
              <Icon size={20} />
              {t[labelKey]}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
