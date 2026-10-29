import { useEffect, useState } from "react";
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
  const [canEdit, setCanEdit] = useState<boolean | null>(null);

  // Права перевіряє база: власник або учень класу з дозволом
  useEffect(() => {
    if (!set) return;
    supabase
      .rpc("can_edit_set", { sid: set.id })
      .then(({ data }) => setCanEdit(Boolean(data)));
  }, [set]);

  if (loading || (set && canEdit === null)) return <p>Завантаження...</p>;
  if (notFound || !set) return <SetNotFound />;

  if (!canEdit) {
    return <Navigate to={`/sets/${set.id}`} replace />;
  }

  return (
    <EditSetForm set={set} cards={cards} isOwner={user?.id === set.owner_id} />
  );
}

interface EditSetFormProps {
  set: StudySet;
  cards: Card[];
  isOwner: boolean;
}

function EditSetForm({ set, cards, isOwner }: EditSetFormProps) {
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

    if (isOwner && !title.trim()) {
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
      // 1. Назву та опис може змінювати лише власник
      if (isOwner) {
        const { error: updateError } = await supabase
          .from("sets")
          .update({
            title: title.trim(),
            description: description.trim() || null,
          })
          .eq("id", set.id);
        if (updateError) throw updateError;
      }

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

      // 3. Оновлюємо існуючі картки і додаємо нові
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

      {!isOwner && (
        <p className="notice">
          Викладач дозволив редагувати картки цього сету. Назву й опис може
          змінювати лише автор.
        </p>
      )}

      <form className="set-form" onSubmit={handleSubmit}>
        <label className="field">
          Назва
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isOwner}
          />
        </label>

        <label className="field">
          Опис (необов'язково)
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isOwner}
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
