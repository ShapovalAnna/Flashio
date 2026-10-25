import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Card, StudySet } from "../types";

export function useSetWithCards(id: string | undefined) {
  const [set, setSet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load(setId: string) {
      const { data: setData, error: setError } = await supabase
        .from("sets")
        .select("*")
        .eq("id", setId)
        .maybeSingle();

      if (cancelled) return;

      if (setError || !setData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: cardsData } = await supabase
        .from("cards")
        .select("*")
        .eq("set_id", setId)
        .order("position");

      if (cancelled) return;

      setSet(setData);
      setCards(cardsData ?? []);
      setLoading(false);
    }

    load(id);

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { set, cards, loading, notFound };
}
