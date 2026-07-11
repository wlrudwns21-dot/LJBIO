import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Lang = "ko" | "en";

interface LangState {
  lang: Lang;
  toggle: () => void;
  set: (l: Lang) => void;
  /** Pick the Korean or English string for the current language. */
  t: (ko: string, en: string) => string;
}

const LangContext = createContext<LangState | null>(null);
const KEY = "ljbio_lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return (localStorage.getItem(KEY) as Lang) || "ko";
    } catch {
      return "ko";
    }
  });

  const set = useCallback((l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => set(lang === "ko" ? "en" : "ko"), [lang, set]);
  const t = useCallback((ko: string, en: string) => (lang === "ko" ? ko : en), [lang]);

  return (
    <LangContext.Provider value={{ lang, toggle, set, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within <LangProvider>");
  return ctx;
}
