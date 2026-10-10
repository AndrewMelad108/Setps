import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language, TranslationKey, Translator, translate } from "./locale";
import { useToast } from "./Toast";
export type { Translator } from "./locale";
const LanguageContext = createContext({
  language: "ar" as Language,
  t: ((key: TranslationKey) => key) as Translator,
  changeLanguage: (_language: Language) => {},
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [language, setLanguage] = useState<Language>("ar");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("daily-bloom:language")
      .then(value => { if (value === "ar" || value === "en") setLanguage(value); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    AsyncStorage.setItem("daily-bloom:language", next).catch(() => showToast({
      type: "warning",
      title: translate(next, "تعذّر حفظ اللغة"),
      message: translate(next, "تم تغيير اللغة لهذه الجلسة فقط."),
    }));
  };
  if (!ready) return null;
  return <LanguageContext.Provider value={{ language, t: key => translate(language, key), changeLanguage }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
