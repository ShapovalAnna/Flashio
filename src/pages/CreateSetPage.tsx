import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { createEmptyCard, validateCards } from "../lib/cards";
import CardsEditor from "../components/CardsEditor";
import AiGenerateForm from "../components/AiGenerateForm";
import type { CardDraft, GeneratedSet } from "../types";

type Mode = "choose" | "manual" | "ai";

export default function CreateSetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Якщо в адресі вказано спосіб (?mode=ai або ?mode=manual), одразу відкриваємо потрібний екран
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(
    initialMode === "ai" || initialMode === "manual" ? initialMode : "choose",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState<CardDraft[]>(() => [
    createEmptyCard(),
    createEmptyCard(),
    createEmptyCard(),
  ]);
  const [fromAi, setFromAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ШІ повернув чернетку: підставляємо її в редактор для перевірки
  function handleGenerated(result: GeneratedSet) {
    setTitle(result.title);
    setCards(
      result.cards.map((card) => ({
        key: crypto.randomUUID(),
        term: card.term,
        definition: card.definition,
      })),
    );
    setFromAi(true);
    setError(null);
    setMode("manual");
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (!title.trim()) {
      setError("Введи назву сету");
      return;
    }

    const { cards: validCards, error: validationError } = validateCards(cards);
    if (validationError) {
      setError(validationError);
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
      validCards.map((card, index) => ({
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

  // ---------- Вибір способу ----------
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

          <button className="choice-card" onClick={() => setMode("ai")}>
            <span className="choice-icon">✨</span>
            <strong>За допомогою ШІ</strong>
            <span className="muted">
              Опиши тему, і ШІ підбере слова з перекладом
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ---------- Генерація ШІ ----------
  if (mode === "ai") {
    return (
      <div>
        <button
          type="button"
          className="back-link link-button"
          onClick={() => setMode("choose")}
        >
          ← Назад
        </button>
        <h1>Новий сет зі ШІ ✨</h1>
        <p className="muted">
          Опиши тему, і ШІ створить чернетку: англійське слово з одного боку,
          український переклад з іншого. Перед збереженням ти зможеш усе
          перевірити й виправити.
        </p>

        <AiGenerateForm onGenerated={handleGenerated} />
      </div>
    );
  }

  // ---------- Редактор (вручну або перевірка чернетки ШІ) ----------
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

      {fromAi && (
        <div className="notice ai-notice">
          <span>
            ✨ ШІ підготував чернетку з {cards.length} слів. Перевір переклади,
            виправ або видали зайве, а потім збережи сет.
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => setMode("ai")}
          >
            Згенерувати ще раз
          </button>
        </div>
      )}

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
