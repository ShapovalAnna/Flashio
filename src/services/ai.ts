import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { GeneratedSet, Level } from "../types";

interface GenerateParams {
  topic: string;
  level: Level;
  count: number;
}

export async function generateSet(
  params: GenerateParams,
): Promise<GeneratedSet> {
  const { data, error } = await supabase.functions.invoke("generate-set", {
    body: params,
  });

  if (error) {
    console.error("generateSet error:", error);

    let message = "Не вдалося зв'язатися з сервером ШІ";

    if (error instanceof FunctionsHttpError) {
      const status = error.context.status;
      const body = await error.context.json().catch(() => null);

      if (status === 546) {
        // Supabase зупинив функцію через ліміт часу
        message =
          "ШІ відповідав занадто довго. Спробуй ще раз або зменш кількість слів.";
      } else {
        // Наша функція повертає поле error, а сам Supabase — поле message
        message =
          body?.error ?? body?.message ?? `Помилка сервера (код ${status})`;
      }
    }

    throw new Error(message);
  }

  return data as GeneratedSet;
}
