import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import uk from "./uk";
import en from "./en";

i18n
  .use(LanguageDetector) // визначає мову: спершу збережений вибір, потім мова браузера
  .use(initReactI18next) // підключає i18next до React
  .init({
    resources: {
      uk: { translation: uk },
      en: { translation: en },
    },
    supportedLngs: ["uk", "en"],
    fallbackLng: "uk", // якщо мова браузера не підтримується — українська
    interpolation: { escapeValue: false }, // React сам захищає від XSS
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "flashio-lang",
    },
  });

// Оновлюємо атрибут lang у <html>, щоб браузер знав мову сторінки
document.documentElement.lang = i18n.resolvedLanguage ?? "uk";
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;

