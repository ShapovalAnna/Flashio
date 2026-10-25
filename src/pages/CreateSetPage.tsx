import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { createEmptyCard } from "../lib/cards";
import CardsEditor from "../components/CardsEditor";
import type { CardDraft } from "../types";

type Mode = "choose" | "manual";

export default function CreateSetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("choose");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<CardDraft[]>(() => [
    createEmptyCard(),
    createEmptyCard(),
    createEmptyCard(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Беремо лише заповнені картки, прибираємо зайві пробіли
    const filledCards = cards
      .map((card) => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
      }))
      .filter((card) => card.term || card.definition);

    if (!title.trim()) {
      setError("Введи назву сету");
      return;
    }
    if (filledCards.some((card) => !card.term || !card.definition)) {
      setError("У кожної картки мають бути заповнені обидві сторони");
      return;
    }
    if (filledCards.length < 2) {
      setError("Додай щонайменше 2 картки");
      return;
    }

    setSaving(true);

    // id генеруємо одразу, щоб знати, до якого сету прив'язати картки
    const setId = crypto.randomUUID();

    const { error: insertSetError } = await supabase.from("sets").insert({
      id: setId,
      owner_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
    });

    if (insertSetError) {
      console.error(insertSetError);
      setError("Не вдалося створити сет");
      setSaving(false);
      return;
    }

    const { error: insertCardsError } = await supabase.from("cards").insert(
      filledCards.map((card, index) => ({
        set_id: setId,
        term: card.term,
        definition: card.definition,
        position: index,
      })),
    );

    setSaving(false);

    if (insertCardsError) {
      console.error(insertCardsError);
      setError("Сет створено, але не вдалося зберегти картки");
      return;
    }

    navigate(`/sets/${setId}`);
  }

  if (mode === "choose") {
    return (
      <div>
        <Link to="/sets" className="back-link">
          ← Мої сети
        </Link>
        <h1>Новий сет</h1>
        <p className="muted">Як ти хочеш створити сет?</p>

        <div className="choice-grid">
          <button className="choice-card" onClick={() => setMode("manual")}>
            <span className="choice-icon">✍️</span>
            <strong>Вручну</strong>
            <span className="muted">Самостійно додай слова і переклади</span>
          </button>

          <button className="choice-card" disabled>
            <span className="choice-icon">✨</span>
            <strong>За допомогою ШІ</strong>
            <span className="muted">Скоро: опиши тему, і ШІ підбере слова</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="back-link link-button"
        onClick={() => setMode("choose")}
      >
        ← Назад
      </button>
      <h1>Новий сет</h1>

      <form className="set-form" onSubmit={handleSubmit}>
        <label className="field">
          Назва
          <input
            className="input"
            placeholder="Наприклад: Подорожі, Unit 5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          Опис (необов'язково)
          <input
            className="input"
            placeholder="Про що цей сет"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <h2>Картки</h2>
        <CardsEditor cards={cards} onChange={setCards} />

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Збереження..." : "Створити сет"}
          </button>
        </div>
      </form>
    </div>
  );
}
