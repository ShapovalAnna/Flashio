import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import type { StudySet } from "../types";

interface SetWithCount extends StudySet {
  cards: { count: number }[];
}

export default function MySetsPage() {
  const { user } = useAuth();
  const userId = user?.id;

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
          setError("Не вдалося завантажити сети");
        } else {
          setSets(data ?? []);
        }
        setLoading(false);
      });
  }, [userId]);

  return (
    <div>
      <div className="page-header">
        <h1>Мої сети</h1>
        <Link to="/sets/new" className="primary-button">
          + Новий сет
        </Link>
      </div>

      {loading && <p>Завантаження...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && sets.length === 0 && (
        <div className="empty-state">
          <h2>У тебе ще немає сетів</h2>
          <p className="muted">Створи перший сет і почни вивчати слова.</p>
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
