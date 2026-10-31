import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "uk", label: "UA" },
  { code: "en", label: "EN" },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="lang-switcher" role="group" aria-label={t("nav.language")}>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={i18n.resolvedLanguage === lang.code ? "active" : ""}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
