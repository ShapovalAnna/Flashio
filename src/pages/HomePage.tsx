import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { StudySet } from "../types";

export default function HomePage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  useDocumentTitle();

  if (loading) return <p>{t("common.loading")}</p>;

  return user ? <Dashboard /> : <Landing />;
}

// ================= Для гостей =================

// Тексти беруться зі словника за ключами home.features.<key>
const FEATURES = [
  { icon: "✨", key: "ai" },
  { icon: "🃏", key: "study" },
  { icon: "🔊", key: "speech" },
  { icon: "👩‍🏫", key: "classes" },
];

const STEPS = ["account", "set", "learn"];

function Landing() {
  const { t } = useTranslation();

  return (
    <div className="landing">
      <section className="hero">
        <h1>
          {t("home.heroTitle")} <span className="accent">Flashio</span>
        </h1>
        <p className="hero-text">{t("home.heroText")}</p>
        <div className="hero-actions">
          <Link to="/register" className="primary-button big">
            {t("home.start")}
          </Link>
          <Link to="/login" className="secondary-button big">
            {t("home.haveAccount")}
          </Link>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((feature) => (
          <div key={feature.key} className="feature">
            <span className="choice-icon">{feature.icon}</span>
            <h3>{t(`home.features.${feature.key}.title`)}</h3>
            <p className="muted">{t(`home.features.${feature.key}.text`)}</p>
          </div>
        ))}
      </section>

      <section className="panel how-it-works">
        <h2>{t("home.howTitle")}</h2>
        <div className="steps">
          {STEPS.map((step, index) => (
            <div key={step} className="step">
              <span className="step-number">{index + 1}</span>
              <div>
                <strong>{t(`home.steps.${step}.title`)}</strong>
                <p className="muted">{t(`home.steps.${step}.text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ================= Для користувачів =================

interface SetWithCount extends StudySet {
  cards: { count: number }[];
}

function Dashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const userId = user?.id;
  const isTeacher = profile?.role === "teacher";

  const [recentSets, setRecentSets] = useState<SetWithCount[]>([]);
  const [loadingSets, setLoadingSets] = useState(true);

  useEffect(() => {
    if (!userId) return;

    supabase
      .from("sets")
      .select("*, cards(count)")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (error) console.error(error);
        setRecentSets(data ?? []);
        setLoadingSets(false);
      });
  }, [userId]);

  return (
    <div>
      <h1>
        {t("home.greeting", { name: profile?.username ?? t("home.friend") })}
      </h1>
      <p className="muted">{t("home.subtitle")}</p>

      <div className="quick-actions">
        <Link to="/sets/new?mode=ai" className="quick-action highlight">
          <span className="choice-icon">✨</span>
          <strong>{t("home.quickAi.title")}</strong>
          <span className="quick-action-text">{t("home.quickAi.text")}</span>
        </Link>

        <Link to="/sets/new?mode=manual" className="quick-action">
          <span className="choice-icon">✍️</span>
          <strong>{t("home.quickManual.title")}</strong>
          <span className="quick-action-text">
            {t("home.quickManual.text")}
          </span>
        </Link>

        <Link to="/classes" className="quick-action">
          <span className="choice-icon">{isTeacher ? "👩‍🏫" : "🎓"}</span>
          <strong>{t("home.quickClasses.title")}</strong>
          <span className="quick-action-text">
            {isTeacher
              ? t("home.quickClasses.teacher")
              : t("home.quickClasses.student")}
          </span>
        </Link>
      </div>

      <div className="section-header">
        <h2>{t("home.recentSets")}</h2>
        {recentSets.length > 0 && <Link to="/sets">{t("home.allSets")}</Link>}
      </div>

      {loadingSets ? (
        <p>{t("common.loading")}</p>
      ) : recentSets.length === 0 ? (
        <div className="empty-state">
          <h2>{t("home.emptyTitle")}</h2>
          <p className="muted">{t("home.emptyText")}</p>
        </div>
      ) : (
        <div className="sets-grid">
          {recentSets.map((set) => (
            <Link key={set.id} to={`/sets/${set.id}`} className="set-tile">
              <h3>{set.title}</h3>
              <p className="muted">
                {cardsCountLabel(set.cards[0]?.count ?? 0)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
