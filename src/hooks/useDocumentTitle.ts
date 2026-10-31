import { useEffect } from "react";
import { useTranslation } from "react-i18next";

// Встановлює назву вкладки браузера, наприклад «Мої сети · Flashio»
export function useDocumentTitle(title?: string) {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = title ? `${title} · Flashio` : t("meta.defaultTitle");
  }, [title, t]);
}
