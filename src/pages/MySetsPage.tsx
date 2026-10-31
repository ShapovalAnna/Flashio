import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { StudySet } from "../types";

interface SetWithCount extends StudySet {
  cards: { count: number }[];
}

export default function MySetsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id;
  useDocumentTitle(t("sets.title"));

  const [sets, setSets] = useState<SetWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("sets")
      .select("*, cards(count)")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error: loadError }) => {
        if (loadError) {
          console.error(loadError);
          setError("load");
        } else {
          setSets(data ?? []);
        }
        setLoading(false);
      });
  }, [userId]);

  return (
    <div>
      <div className="page-header">
        <h1>{t("sets.title")}</h1>
        <Link to="/sets/new" className="primary-button">
          {t("sets.newSet")}
        </Link>
      </div>

      {loading && <p>{t("common.loading")}</p>}
      {error && <p className="error">{t("sets.loadError")}</p>}

      {!loading && !error && sets.length === 0 && (
        <div className="empty-state">
          <h2>{t("sets.emptyTitle")}</h2>
          <p className="muted">{t("sets.emptyText")}</p>
        </div>
      )}

      <div className="sets-grid">
        {sets.map((set) => (
          <Link key={set.id} to={`/sets/${set.id}`} className="set-tile">
            <h3>{set.title}</h3>
            <p className="muted">{cardsCountLabel(set.cards[0]?.count ?? 0)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
