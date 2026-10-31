import { useEffect } from "react";

// Встановлює назву вкладки браузера, наприклад «Мої сети · Flashio»
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `${title} · Flashio`
      : "Flashio — вивчай англійську зі ШІ";
  }, [title]);
}
