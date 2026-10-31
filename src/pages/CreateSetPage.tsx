import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { createEmptyCard, validateCards } from "../lib/cards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import CardsEditor from "../components/CardsEditor";
import AiGenerateForm from "../components/AiGenerateForm";
import type { CardDraft, GeneratedSet } from "../types";

type Mode = "choose" | "manual" | "ai";

export default function CreateSetPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle(t("create.title"));

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
      setError(t("validation.noTitle"));
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
      setError(t("create.createFailed"));
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
      setError(t("create.cardsFailed"));
      return;
    }

    navigate(`/sets/${setId}`);
  }

  // ---------- Вибір способу ----------
  if (mode === "choose") {
    return (
      <div>
        <Link to="/sets" className="back-link">
          {t("sets.backToSets")}
        </Link>
        <h1>{t("create.title")}</h1>
        <p className="muted">{t("create.how")}</p>

        <div className="choice-grid">
          <button className="choice-card" onClick={() => setMode("manual")}>
            <span className="choice-icon">✍️</span>
            <strong>{t("create.manual.title")}</strong>
            <span className="muted">{t("create.manual.text")}</span>
          </button>

          <button className="choice-card" onClick={() => setMode("ai")}>
            <span className="choice-icon">✨</span>
            <strong>{t("create.ai.title")}</strong>
            <span className="muted">{t("create.ai.text")}</span>
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
          {t("sets.back")}
        </button>
        <h1>{t("create.aiTitle")}</h1>
        <p className="muted">{t("create.aiIntro")}</p>

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
        {t("sets.back")}
      </button>
      <h1>{t("create.title")}</h1>

      {fromAi && (
        <div className="notice ai-notice">
          <span>
            {t("create.aiDraft", {
              words: t("common.words", { count: cards.length }),
            })}
          </span>
          <button
            type="button"
            className="link-button"
            onClick={() => setMode("ai")}
          >
            {t("create.regenerate")}
          </button>
        </div>
      )}

      <form className="set-form" onSubmit={handleSubmit}>
        <label className="field">
          {t("setForm.name")}
          <input
            className="input"
            placeholder={t("setForm.namePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="field">
          {t("setForm.description")}
          <input
            className="input"
            placeholder={t("setForm.descriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <h2>{t("setForm.cards")}</h2>
        <CardsEditor cards={cards} onChange={setCards} />

        {error && <p className="error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? t("create.saving") : t("create.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
