import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { en } from "../i18n/en";
import { ru } from "../i18n/ru";
import type { Translations } from "../i18n/types";

type Lang = "en" | "ru";

interface I18nContextValue {
  t: Translations;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const dictionaries: Record<Lang, Translations> = { en, ru };

function detectBrowserLanguage(): Lang {
  const nav = navigator.language || "";
  if (nav.startsWith("ru")) return "ru";
  return "en";
}

function getStoredLang(): Lang | null {
  try {
    const stored = localStorage.getItem("applyhawk_lang");
    if (stored === "en" || stored === "ru") return stored;
  } catch {}
  return null;
}

export const I18nContext = createContext<I18nContextValue>({
  t: en,
  lang: "en",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(
    () => getStoredLang() || detectBrowserLanguage(),
  );

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    try {
      localStorage.setItem("applyhawk_lang", newLang);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t: dictionaries[lang], lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}
