import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { validateCards } from "../lib/cards";
import { useSetWithCards } from "../hooks/useSetWithCards";
import CardsEditor from "../components/CardsEditor";
import SetNotFound from "../components/SetNotFound";
import type { Card, CardDraft, StudySet } from "../types";

export default function EditSetPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { set, cards, loading, notFound } = useSetWithCards(id);

  if (loading) return <p>Завантаження...</p>;
  if (notFound || !set) return <SetNotFound />;

  // Поки що редагувати може лише власник. Права учнів у класах додамо пізніше
  if (user?.id !== set.owner_id) {
    return <Navigate to={`/sets/${set.id}`} replace />;
  }

  return <EditSetForm set={set} cards={cards} />;
}

interface EditSetFormProps {
  set: StudySet;
  cards: Card[];
}

function EditSetForm({ set, cards }: EditSetFormProps) {
  const navigate = useNavigate();

  const [title, setTitle] = useState(set.title);
  const [description, setDescription] = useState(set.description ?? "");
  const [drafts, setDrafts] = useState<CardDraft[]>(() =>
    cards.map((card) => ({
      key: card.id,
      id: card.id,
      term: card.term,
      definition: card.definition,
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Введи назву сету");
      return;
    }

    const { cards: validCards, error: validationError } = validateCards(drafts);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      // 1. Оновлюємо назву та опис
      const { error: updateError } = await supabase
        .from("sets")
        .update({
          title: title.trim(),
          description: description.trim() || null,
        })
        .eq("id", set.id);
      if (updateError) throw updateError;

      // 2. Видаляємо картки, які прибрали з редактора
      const keptIds = new Set(
        validCards.map((card) => card.id).filter(Boolean),
      );
      const removedIds = cards
        .map((card) => card.id)
        .filter((cardId) => !keptIds.has(cardId));

      if (removedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("cards")
          .delete()
          .in("id", removedIds);
        if (deleteError) throw deleteError;
      }

      // 3. Оновлюємо існуючі картки і додаємо нові (upsert = update або insert)
      const { error: upsertError } = await supabase.from("cards").upsert(
        validCards.map((card, index) => ({
          id: card.id ?? crypto.randomUUID(),
          set_id: set.id,
          term: card.term,
          definition: card.definition,
          position: index,
        })),
      );
      if (upsertError) throw upsertError;

      navigate(`/sets/${set.id}`);
    } catch (err) {
      console.error(err);
      setError("Не вдалося зберегти зміни");
      setSaving(false);
    }
  }

  return (
    <div>
      <Link to={`/sets/${set.id}`} className="back-link">
        ← {set.title}
      </Link>
      <h1>Редагування сету</h1>

      <form className="set-form" onSubmit={handleSubmit}>
        <label className="field">
          Назва
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          Опис (необов'язково)
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <h2>Картки</h2>
        <CardsEditor cards={drafts} onChange={setDrafts} />

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <Link to={`/sets/${set.id}`} className="secondary-button">
            Скасувати
          </Link>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Збереження..." : "Зберегти зміни"}
          </button>
        </div>
      </form>
    </div>
  );
}
