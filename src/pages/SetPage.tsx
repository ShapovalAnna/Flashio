import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import { useSetWithCards } from "../hooks/useSetWithCards";
import SetNotFound from "../components/SetNotFound";

export default function SetPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { set, cards, loading, notFound } = useSetWithCards(id);
  const [canEdit, setCanEdit] = useState(false);

  // Питаємо базу, чи може поточний користувач редагувати цей сет
  useEffect(() => {
    if (!set) return;
    supabase
      .rpc("can_edit_set", { sid: set.id })
      .then(({ data }) => setCanEdit(Boolean(data)));
  }, [set]);

  async function handleDelete() {
    if (!set) return;
    if (
      !window.confirm(`Видалити сет «${set.title}»? Цю дію не можна скасувати.`)
    )
      return;

    const { error } = await supabase.from("sets").delete().eq("id", set.id);
    if (error) {
      console.error(error);
      alert("Не вдалося видалити сет");
      return;
    }
    navigate("/sets");
  }

  if (loading) return <p>Завантаження...</p>;
  if (notFound || !set) return <SetNotFound />;

  const isOwner = user?.id === set.owner_id;

  return (
    <div>
      <Link to={isOwner ? "/sets" : "/classes"} className="back-link">
        {isOwner ? "← Мої сети" : "← Мої класи"}
      </Link>

      <div className="page-header">
        <div>
          <h1>{set.title}</h1>
          {set.description && <p className="muted">{set.description}</p>}
          <p className="muted">{cardsCountLabel(cards.length)}</p>
        </div>

        {(canEdit || isOwner) && (
          <div className="header-actions">
            {canEdit && (
              <Link to={`/sets/${set.id}/edit`} className="secondary-button">
                Редагувати
              </Link>
            )}
            {isOwner && (
              <button className="danger-button" onClick={handleDelete}>
                Видалити
              </button>
            )}
          </div>
        )}
      </div>

      <div className="study-modes">
        <Link to={`/sets/${set.id}/study`} className="mode-tile">
          <span className="choice-icon">🃏</span>
          <strong>Картки</strong>
          <span className="muted">Перегортай і запам'ятовуй</span>
        </Link>

        <Link to={`/sets/${set.id}/quiz`} className="mode-tile">
          <span className="choice-icon">📝</span>
          <strong>Тест</strong>
          <span className="muted">Обери правильний переклад</span>
        </Link>
      </div>

      <h2>Слова в сеті</h2>
      <div className="cards-list">
        {cards.map((card) => (
          <div key={card.id} className="card-item">
            <span className="term">{card.term}</span>
            <span>{card.definition}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
