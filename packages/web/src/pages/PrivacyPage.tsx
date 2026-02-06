import { ArrowLeft } from "lucide-react";
import { useHashRoute } from "../hooks/useHashRoute";
import { useI18n } from "../hooks/useI18n";
import styles from "./PrivacyPage.module.css";

export default function PrivacyPage() {
  const { navigate } = useHashRoute();
  const { lang } = useI18n();

  if (lang === "ru") return <PrivacyRu onBack={() => navigate("/")} />;
  return <PrivacyEn onBack={() => navigate("/")} />;
}

function PrivacyEn({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.page}>
      <a href="#/" className={styles.backLink} onClick={(e) => { e.preventDefault(); onBack(); }}>
        <ArrowLeft size={14} /> Back to home
      </a>

      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: February 6, 2025</p>

      <div className={styles.highlight}>
        <p>
          ApplyHawk is a privacy-first tool. All your data stays in your browser.
          We do not collect, store, or transmit any personal information to our servers.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>What Data ApplyHawk Uses</h2>
        <p className={styles.text}>
          ApplyHawk processes the following data entirely within your browser (locally):
        </p>
        <ul className={styles.list}>
          <li>Your resume information (name, experience, skills, education, contacts)</li>
          <li>Job descriptions you paste or that are detected on job pages</li>
          <li>Your OpenRouter API key for AI-powered features</li>
          <li>Your preferred settings (AI model, personalization level, language)</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Where Data Is Stored</h2>
        <p className={styles.text}>
          All data is stored exclusively in your browser's local storage (for the website)
          or Chrome extension storage (for the extension). No data is sent to ApplyHawk servers
          because we don't operate any servers for data collection.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Third-Party Services</h2>
        <p className={styles.text}>
          When you use AI features, your job descriptions and resume data are sent to the
          OpenRouter API (openrouter.ai) using your own API key. This communication happens
          directly between your browser and OpenRouter — ApplyHawk does not proxy or intercept
          this traffic. Please review{" "}
          <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">
            OpenRouter's privacy policy
          </a>{" "}
          for details on how they handle data.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Chrome Extension Permissions</h2>
        <p className={styles.text}>
          The ApplyHawk Chrome extension requests the following permissions:
        </p>
        <ul className={styles.list}>
          <li><strong>Storage</strong> — to save your resume, settings, and preferences locally in Chrome</li>
          <li><strong>Active Tab / Tabs / Scripting</strong> — to detect job pages and inject the ApplyHawk button on supported job boards</li>
          <li><strong>Side Panel</strong> — to display the ApplyHawk side panel interface</li>
          <li><strong>Cookies</strong> — to check authentication status on HH.ru for the direct apply feature</li>
          <li><strong>Host permissions</strong> (job sites) — to detect and parse job postings on supported platforms (HH.ru, LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, etc.)</li>
        </ul>
        <p className={styles.text}>
          The optional "all URLs" permission is requested only when you want to use ApplyHawk
          on a job board not in the default list. You can deny this permission and the extension
          will still work on all pre-configured platforms.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data We Do NOT Collect</h2>
        <ul className={styles.list}>
          <li>We do not collect analytics or usage telemetry</li>
          <li>We do not track which jobs you view or apply to</li>
          <li>We do not have access to your OpenRouter API key</li>
          <li>We do not store any data on remote servers</li>
          <li>We do not use cookies for tracking</li>
          <li>We do not share any data with third parties</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Deletion</h2>
        <p className={styles.text}>
          Since all data is stored locally in your browser, you can delete it at any time by:
        </p>
        <ul className={styles.list}>
          <li>Clearing your browser's local storage for the ApplyHawk website</li>
          <li>Removing the Chrome extension (which clears all extension storage)</li>
          <li>Using the "Clear Data" option in the extension settings</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Open Source</h2>
        <p className={styles.text}>
          ApplyHawk is open source. You can review the complete source code to verify
          our privacy practices at{" "}
          <a href="https://github.com/ofcRS/applyhawk" target="_blank" rel="noopener noreferrer">
            github.com/ofcRS/applyhawk
          </a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Changes to This Policy</h2>
        <p className={styles.text}>
          If we make changes to this privacy policy, we will update the "Last updated" date
          at the top of this page. Significant changes will be communicated through the
          extension update notes.
        </p>
      </section>

      <p className={styles.contact}>
        Questions about privacy? Open an issue on{" "}
        <a href="https://github.com/ofcRS/applyhawk/issues" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>.
      </p>
    </div>
  );
}

function PrivacyRu({ onBack }: { onBack: () => void }) {
  return (
    <div className={styles.page}>
      <a href="#/" className={styles.backLink} onClick={(e) => { e.preventDefault(); onBack(); }}>
        <ArrowLeft size={14} /> На главную
      </a>

      <h1 className={styles.title}>Политика конфиденциальности</h1>
      <p className={styles.updated}>Обновлено: 6 февраля 2025</p>

      <div className={styles.highlight}>
        <p>
          ApplyHawk — инструмент с приоритетом конфиденциальности. Все ваши данные
          остаются в вашем браузере. Мы не собираем, не храним и не передаём
          персональную информацию на наши серверы.
        </p>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Какие данные использует ApplyHawk</h2>
        <p className={styles.text}>
          ApplyHawk обрабатывает следующие данные полностью в вашем браузере (локально):
        </p>
        <ul className={styles.list}>
          <li>Информация из резюме (имя, опыт, навыки, образование, контакты)</li>
          <li>Описания вакансий, которые вы вставляете или которые обнаруживаются на страницах вакансий</li>
          <li>Ваш API-ключ OpenRouter для функций на основе ИИ</li>
          <li>Ваши настройки (модель ИИ, уровень персонализации, язык)</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Где хранятся данные</h2>
        <p className={styles.text}>
          Все данные хранятся исключительно в локальном хранилище вашего браузера (для сайта)
          или в хранилище расширения Chrome (для расширения). Данные не отправляются на
          серверы ApplyHawk, потому что у нас нет серверов для сбора данных.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Сторонние сервисы</h2>
        <p className={styles.text}>
          При использовании функций ИИ описания вакансий и данные резюме отправляются
          в OpenRouter API (openrouter.ai) с использованием вашего собственного API-ключа.
          Этот обмен происходит напрямую между вашим браузером и OpenRouter — ApplyHawk
          не перехватывает и не проксирует этот трафик. Ознакомьтесь с{" "}
          <a href="https://openrouter.ai/privacy" target="_blank" rel="noopener noreferrer">
            политикой конфиденциальности OpenRouter
          </a>.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Разрешения расширения Chrome</h2>
        <p className={styles.text}>
          Расширение ApplyHawk для Chrome запрашивает следующие разрешения:
        </p>
        <ul className={styles.list}>
          <li><strong>Storage</strong> — для сохранения резюме, настроек и предпочтений локально в Chrome</li>
          <li><strong>Active Tab / Tabs / Scripting</strong> — для обнаружения страниц вакансий и добавления кнопки ApplyHawk</li>
          <li><strong>Side Panel</strong> — для отображения боковой панели ApplyHawk</li>
          <li><strong>Cookies</strong> — для проверки авторизации на HH.ru для функции быстрого отклика</li>
          <li><strong>Host permissions</strong> (сайты вакансий) — для обнаружения и разбора вакансий на поддерживаемых платформах</li>
        </ul>
        <p className={styles.text}>
          Опциональное разрешение на доступ ко всем сайтам запрашивается только если вы хотите
          использовать ApplyHawk на сайте вакансий, который отсутствует в стандартном списке.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Данные, которые мы НЕ собираем</h2>
        <ul className={styles.list}>
          <li>Мы не собираем аналитику и телеметрию</li>
          <li>Мы не отслеживаем, какие вакансии вы просматриваете</li>
          <li>Мы не имеем доступа к вашему API-ключу OpenRouter</li>
          <li>Мы не храним данные на удалённых серверах</li>
          <li>Мы не используем cookies для отслеживания</li>
          <li>Мы не передаём данные третьим лицам</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Удаление данных</h2>
        <p className={styles.text}>
          Поскольку все данные хранятся локально, вы можете удалить их в любое время:
        </p>
        <ul className={styles.list}>
          <li>Очистив локальное хранилище браузера для сайта ApplyHawk</li>
          <li>Удалив расширение Chrome (при этом все данные расширения удаляются)</li>
          <li>Используя опцию «Очистить данные» в настройках расширения</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Открытый исходный код</h2>
        <p className={styles.text}>
          ApplyHawk — проект с открытым исходным кодом. Вы можете проверить наши
          практики конфиденциальности в{" "}
          <a href="https://github.com/ofcRS/applyhawk" target="_blank" rel="noopener noreferrer">
            репозитории на GitHub
          </a>.
        </p>
      </section>

      <p className={styles.contact}>
        Вопросы о конфиденциальности? Откройте issue на{" "}
        <a href="https://github.com/ofcRS/applyhawk/issues" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>.
      </p>
    </div>
  );
}
