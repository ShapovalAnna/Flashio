import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import i18n from "../i18n";
import type { GeneratedSet, Level } from "../types";

interface GenerateParams {
  topic: string;
  level: Level;
  count: number;
}

// За кодом відповіді сервера обираємо повідомлення зі словника потрібною мовою
function errorKeyByStatus(status: number): string | null {
  switch (status) {
    case 504:
    case 546: // Supabase зупинив функцію через ліміт часу
      return "timeout";
    case 503:
      return "overloaded";
    case 429:
      return "rateLimit";
    case 502:
      return "unavailable";
    case 400:
      return "badRequest";
    case 500:
      return "server";
    default:
      return null;
  }
}

export async function generateSet(
  params: GenerateParams,
): Promise<GeneratedSet> {
  const { data, error } = await supabase.functions.invoke("generate-set", {
    body: params,
  });

  if (error) {
    console.error("generateSet error:", error);

    let message = i18n.t("aiErrors.network");

    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const key = errorKeyByStatus(status);
      message = key
        ? i18n.t(`aiErrors.${key}`)
        : i18n.t("aiErrors.unknown", { status });
    }

    throw new Error(message);
  }

  return data as GeneratedSet;
}
