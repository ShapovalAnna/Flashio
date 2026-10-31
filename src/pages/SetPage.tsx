import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import { useSetWithCards } from "../hooks/useSetWithCards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import SetNotFound from "../components/SetNotFound";
import SpeakButton from "../components/SpeakButton";

export default function SetPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { set, cards, loading, notFound } = useSetWithCards(id);
  const [canEdit, setCanEdit] = useState(false);
  useDocumentTitle(set?.title);

  // Питаємо базу, чи може поточний користувач редагувати цей сет
  useEffect(() => {
    if (!set) return;
    supabase
      .rpc("can_edit_set", { sid: set.id })
      .then(({ data }) => setCanEdit(Boolean(data)));
  }, [set]);

  async function handleDelete() {
    if (!set) return;
    if (!window.confirm(t("setPage.confirmDelete", { title: set.title })))
      return;

    const { error } = await supabase.from("sets").delete().eq("id", set.id);
    if (error) {
      console.error(error);
      alert(t("setPage.deleteFailed"));
      return;
    }
    navigate("/sets");
  }

  if (loading) return <p>{t("common.loading")}</p>;
  if (notFound || !set) return <SetNotFound />;

  const isOwner = user?.id === set.owner_id;

  return (
    <div>
      <Link to={isOwner ? "/sets" : "/classes"} className="back-link">
        {isOwner ? t("sets.backToSets") : t("sets.backToClasses")}
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
                {t("setPage.edit")}
              </Link>
            )}
            {isOwner && (
              <button className="danger-button" onClick={handleDelete}>
                {t("setPage.delete")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="study-modes">
        <Link to={`/sets/${set.id}/study`} className="mode-tile">
          <span className="choice-icon">🃏</span>
          <strong>{t("setPage.flashcards.title")}</strong>
          <span className="muted">{t("setPage.flashcards.text")}</span>
        </Link>

        <Link to={`/sets/${set.id}/quiz`} className="mode-tile">
          <span className="choice-icon">📝</span>
          <strong>{t("setPage.quiz.title")}</strong>
          <span className="muted">{t("setPage.quiz.text")}</span>
        </Link>
      </div>

      <h2>{t("setPage.words")}</h2>
      <div className="cards-list">
        {cards.map((card) => (
          <div key={card.id} className="card-item">
            <span className="term">
              <SpeakButton text={card.term} lang={set.term_lang} />
              {card.term}
            </span>
            <span>{card.definition}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
