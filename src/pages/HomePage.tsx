import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel } from "../lib/cards";
import type { StudySet } from "../types";

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) return <p>Завантаження...</p>;

  return user ? <Dashboard /> : <Landing />;
}

// ================= Для гостей =================

const FEATURES = [
  {
    icon: "✨",
    title: "Сети зі ШІ",
    text: "Опиши тему, і штучний інтелект за кілька секунд підбере слова з перекладом.",
  },
  {
    icon: "🃏",
    title: "Картки й тести",
    text: "Перегортай картки, проходь тести і повторюй слова, які ще не вивчив.",
  },
  {
    icon: "🔊",
    title: "Озвучення",
    text: "Слухай правильну вимову кожного англійського слова.",
  },
  {
    icon: "👩‍🏫",
    title: "Класи",
    text: "Викладач створює клас, дає учням сети і вирішує, чи можна їх редагувати.",
  },
];

const STEPS = [
  { title: "Створи акаунт", text: "Обери роль: учень чи викладач." },
  { title: "Створи сет", text: "Вручну або за допомогою ШІ." },
  { title: "Вчи слова", text: "У режимах «Картки» і «Тест»." },
];

function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <h1>
          Вивчай англійську з <span className="accent">Flashio</span>
        </h1>
        <p className="hero-text">
          Створюй сети карток власноруч або за кілька секунд за допомогою ШІ,
          вчи слова в зручних режимах і займайся разом з класом.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="primary-button big">
            Почати безкоштовно
          </Link>
          <Link to="/login" className="secondary-button big">
            У мене вже є акаунт
          </Link>
        </div>
      </section>

      <section className="features">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="feature">
            <span className="choice-icon">{feature.icon}</span>
            <h3>{feature.title}</h3>
            <p className="muted">{feature.text}</p>
          </div>
        ))}
      </section>

      <section className="panel how-it-works">
        <h2>Як це працює</h2>
        <div className="steps">
          {STEPS.map((step, index) => (
            <div key={step.title} className="step">
              <span className="step-number">{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p className="muted">{step.text}</p>
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
      <h1>Привіт, {profile?.username ?? "друже"}! 👋</h1>
      <p className="muted">Що вивчаємо сьогодні?</p>

      <div className="quick-actions">
        <Link to="/sets/new?mode=ai" className="quick-action highlight">
          <span className="choice-icon">✨</span>
          <strong>Сет зі ШІ</strong>
          <span className="quick-action-text">Опиши тему, і слова готові</span>
        </Link>

        <Link to="/sets/new" className="quick-action">
          <span className="choice-icon">✍️</span>
          <strong>Сет вручну</strong>
          <span className="quick-action-text">
            Додай свої слова і переклади
          </span>
        </Link>

        <Link to="/classes" className="quick-action">
          <span className="choice-icon">{isTeacher ? "👩‍🏫" : "🎓"}</span>
          <strong>Мої класи</strong>
          <span className="quick-action-text">
            {isTeacher
              ? "Створюй класи і давай учням сети"
              : "Вступай до класу за кодом"}
          </span>
        </Link>
      </div>

      <div className="section-header">
        <h2>Останні сети</h2>
        {recentSets.length > 0 && <Link to="/sets">Усі сети →</Link>}
      </div>

      {loadingSets ? (
        <p>Завантаження...</p>
      ) : recentSets.length === 0 ? (
        <div className="empty-state">
          <h2>Тут з'являться твої сети</h2>
          <p className="muted">
            Почни з першого: найшвидше це зробити за допомогою ШІ.
          </p>
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
