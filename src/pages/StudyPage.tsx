import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useSetWithCards } from "../hooks/useSetWithCards";
import { shuffle } from "../lib/cards";
import SetNotFound from "../components/SetNotFound";
import type { Card, StudySet } from "../types";
import SpeakButton from "../components/SpeakButton";
import { speak } from "../lib/speech";

export default function StudyPage() {
  const { id } = useParams();
  const { set, cards, loading, notFound } = useSetWithCards(id);

  if (loading) return <p>Завантаження...</p>;
  if (notFound || !set) return <SetNotFound />;

  return (
    <div>
      <Link to={`/sets/${set.id}`} className="back-link">
        ← {set.title}
      </Link>
      <h1>Картки</h1>

      {cards.length === 0 ? (
        <p className="muted">У цьому сеті ще немає карток.</p>
      ) : (
        <FlashcardsSession set={set} cards={cards} />
      )}
    </div>
  );
}

interface FlashcardsSessionProps {
  set: StudySet;
  cards: Card[];
}

function FlashcardsSession({ set, cards }: FlashcardsSessionProps) {
  const [queue, setQueue] = useState<Card[]>(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [learning, setLearning] = useState<Card[]>([]);
  const [reverse, setReverse] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);

  const finished = index >= queue.length;
  const current = queue[index];

  function restart(list: Card[]) {
    setQueue(list);
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setLearning([]);
  }

  function answer(knows: boolean) {
    if (!current) return;

    if (knows) {
      setKnownCount((n) => n + 1);
    } else {
      setLearning((list) => [...list, current]);
    }

    setFlipped(false);
    setIndex((i) => i + 1);

    // Знімаємо фокус з кнопки, щоб пробіл далі перевертав картку
    (document.activeElement as HTMLElement | null)?.blur();
  }

  // Керування з клавіатури
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (finished) return;

      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.code === "ArrowRight") {
        answer(true);
      } else if (e.code === "ArrowLeft") {
        answer(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
  // Англійське слово видно на лицьовій стороні, а в режимі «Спочатку переклад» — на зворотній
  const termVisible = reverse ? flipped : !flipped;

  // Автоозвучення: вимовляємо слово, щойно воно з'являється
  useEffect(() => {
    if (!autoSpeak || finished || !current || !termVisible) return;
    speak(current.term, set.term_lang);
  }, [autoSpeak, finished, current, termVisible, set.term_lang]);
  if (finished) {
    return (
      <div className="study-finished">
        <h2>Готово! 🎉</h2>
        <p>
          Знаю: <strong>{knownCount}</strong> · Ще вчу:{" "}
          <strong>{learning.length}</strong>
        </p>

        <div className="study-actions">
          {learning.length > 0 && (
            <button
              className="primary-button"
              onClick={() => restart(learning)}
            >
              Повторити ті, що ще вчу ({learning.length})
            </button>
          )}
          <button className="secondary-button" onClick={() => restart(cards)}>
            Почати спочатку
          </button>
          <Link to={`/sets/${set.id}`} className="secondary-button">
            До сету
          </Link>
        </div>
      </div>
    );
  }

  const front = reverse ? current.definition : current.term;
  const back = reverse ? current.term : current.definition;

  return (
    <div className="study">
      <div className="study-toolbar">
        <span className="muted">
          {index + 1} / {queue.length}
        </span>

        <div className="study-toolbar-actions">
          <label className="toggle">
            <input
              type="checkbox"
              checked={reverse}
              onChange={(e) => {
                setReverse(e.target.checked);
                e.target.blur();
              }}
            />
            Спочатку переклад
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => {
                setAutoSpeak(e.target.checked);
                e.target.blur();
              }}
            />
            Автоозвучення
          </label>

          <button
            className="secondary-button"
            onClick={() => restart(shuffle(cards))}
          >
            Перемішати
          </button>
        </div>
      </div>

      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: `${(index / queue.length) * 100}%` }}
        />
      </div>

      {/* key змушує React створити нову картку, щоб наступне слово не показалось перевернутим */}
      <div
        key={current.id}
        className={`flashcard ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="flashcard-inner">
          <div className="flashcard-face">
            {front}
            {!reverse && (
              <div className="face-speak">
                <SpeakButton
                  text={current.term}
                  lang={set.term_lang}
                  size="large"
                />
              </div>
            )}
            <span className="flashcard-hint">Натисни, щоб перевернути</span>
          </div>
          <div className="flashcard-face flashcard-back">
            {back}
            {reverse && (
              <div className="face-speak">
                <SpeakButton
                  text={current.term}
                  lang={set.term_lang}
                  size="large"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="study-actions">
        <button className="learning-button" onClick={() => answer(false)}>
          ✕ Ще вчу
        </button>
        <button className="known-button" onClick={() => answer(true)}>
          ✓ Знаю
        </button>
      </div>

      <p className="muted keyboard-hint">
        Пробіл — перевернути · ← ще вчу · → знаю
      </p>
    </div>
  );
}
