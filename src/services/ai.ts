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
    let message = "Не вдалося зв'язатися з сервером ШІ";

    // Дістаємо зрозуміле повідомлення, яке повернула наша функція
    if (error instanceof FunctionsHttpError) {
      const body = await error.context.json().catch(() => null);
      if (body?.error) message = body.error;
    }

    throw new Error(message);
  }

  return data as GeneratedSet;
}
