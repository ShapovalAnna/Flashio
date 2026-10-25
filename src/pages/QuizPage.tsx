import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useSetWithCards } from "../hooks/useSetWithCards";
import { buildQuestions, type QuizQuestion } from "../lib/quiz";
import SetNotFound from "../components/SetNotFound";
import type { Card, StudySet } from "../types";

export default function QuizPage() {
  const { id } = useParams();
  const { set, cards, loading, notFound } = useSetWithCards(id);

  if (loading) return <p>Завантаження...</p>;
  if (notFound || !set) return <SetNotFound />;

  return (
    <div>
      <Link to={`/sets/${set.id}`} className="back-link">
        ← {set.title}
      </Link>
      <h1>Тест</h1>

      {cards.length < 2 ? (
        <p className="muted">Для тесту потрібно щонайменше 2 картки.</p>
      ) : (
        <QuizSession set={set} cards={cards} />
      )}
    </div>
  );
}

type Phase = "setup" | "playing" | "finished";

interface QuizAnswer {
  question: QuizQuestion;
  chosen: string;
  isCorrect: boolean;
}

interface QuizSessionProps {
  set: StudySet;
  cards: Card[];
}

function QuizSession({ set, cards }: QuizSessionProps) {
  const [phase, setPhase] = useState<Phase>("setup");
  const [reverse, setReverse] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<QuizAnswer[]>([]);

  const correctCount = results.filter((r) => r.isCorrect).length;

  function start(list: Card[]) {
    setQuestions(buildQuestions(list, cards, reverse));
    setIndex(0);
    setSelected(null);
    setResults([]);
    setPhase("playing");
  }

  function choose(option: string) {
    const question = questions[index];
    if (!question || selected !== null) return;

    setSelected(option);
    setResults((list) => [
      ...list,
      { question, chosen: option, isCorrect: option === question.correct },
    ]);
    (document.activeElement as HTMLElement | null)?.blur();
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase("finished");
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
    (document.activeElement as HTMLElement | null)?.blur();
  }

  // Керування з клавіатури: 1–4 обирають відповідь, Enter веде далі
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (phase !== "playing") return;
      const question = questions[index];
      if (!question) return;

      const num = Number(e.key);
      if (selected === null && num >= 1 && num <= question.options.length) {
        choose(question.options[num - 1]);
      } else if (selected !== null && e.key === "Enter") {
        e.preventDefault();
        next();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ---------- Налаштування ----------
  if (phase === "setup") {
    return (
      <div className="quiz-setup">
        <h2>Налаштування тесту</h2>

        <fieldset className="radio-group">
          <legend>Що показувати в питанні</legend>
          <label>
            <input
              type="radio"
              name="direction"
              checked={!reverse}
              onChange={() => setReverse(false)}
            />
            Слово → обрати переклад
          </label>
          <label>
            <input
              type="radio"
              name="direction"
              checked={reverse}
              onChange={() => setReverse(true)}
            />
            Переклад → обрати слово
          </label>
        </fieldset>

        <p className="muted">Кількість питань: {cards.length}</p>

        {cards.length < 4 && (
          <p className="notice">
            Для повноцінного тесту краще мати щонайменше 4 картки, тоді буде 4
            варіанти відповіді.
          </p>
        )}

        <button className="primary-button" onClick={() => start(cards)}>
          Почати тест
        </button>
      </div>
    );
  }

  // ---------- Результати ----------
  if (phase === "finished") {
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const mistakes = results.filter((r) => !r.isCorrect);

    let message = "Варто ще повторити слова";
    if (percent >= 90) message = "Чудовий результат! 🎉";
    else if (percent >= 60) message = "Непогано, ще трохи практики 💪";

    return (
      <div className="quiz-results">
        <div className="score-card">
          <p className="muted">Твій результат</p>
          <p className="score-value">{percent}%</p>
          <p>
            Правильно: <strong>{correctCount}</strong> з{" "}
            <strong>{total}</strong>
          </p>
          <p className="muted">{message}</p>

          <div className="study-actions">
            {mistakes.length > 0 && (
              <button
                className="primary-button"
                onClick={() => start(mistakes.map((m) => m.question.card))}
              >
                Повторити помилки ({mistakes.length})
              </button>
            )}
            <button className="secondary-button" onClick={() => start(cards)}>
              Пройти ще раз
            </button>
            <button
              className="secondary-button"
              onClick={() => setPhase("setup")}
            >
              Налаштування
            </button>
            <Link to={`/sets/${set.id}`} className="secondary-button">
              До сету
            </Link>
          </div>
        </div>

        {mistakes.length > 0 && (
          <>
            <h2>Помилки</h2>
            <div className="mistakes-list">
              {mistakes.map((m) => (
                <div key={m.question.card.id} className="mistake-item">
                  <strong>{m.question.prompt}</strong>
                  <p>
                    Правильно:{" "}
                    <span className="feedback-correct">
                      {m.question.correct}
                    </span>
                  </p>
                  <p className="muted">Твоя відповідь: {m.chosen}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- Питання ----------
  const current = questions[index];
  const isCorrect = selected === current.correct;

  function optionClass(option: string) {
    if (selected === null) return "";
    if (option === current.correct) return "correct";
    if (option === selected) return "wrong";
    return "dimmed";
  }

  return (
    <div className="quiz">
      <div className="study-toolbar">
        <span className="muted">
          Питання {index + 1} з {questions.length}
        </span>
        <span className="muted">Правильно: {correctCount}</span>
      </div>

      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="quiz-card">
        <p className="quiz-label">
          {reverse ? "Обери слово англійською" : "Обери правильний переклад"}
        </p>
        <p className="quiz-prompt">{current.prompt}</p>
      </div>

      <div className="quiz-options">
        {current.options.map((option, i) => (
          <button
            key={option}
            className={`quiz-option ${optionClass(option)}`}
            onClick={() => choose(option)}
            disabled={selected !== null}
          >
            <span className="option-key">{i + 1}</span>
            {option}
          </button>
        ))}
      </div>

      {selected !== null && (
        <div className="quiz-feedback">
          {isCorrect ? (
            <p className="feedback-correct">✓ Правильно!</p>
          ) : (
            <p className="feedback-wrong">
              ✕ Правильна відповідь: {current.correct}
            </p>
          )}
          <button className="primary-button" onClick={next}>
            {index + 1 >= questions.length ? "Результати →" : "Далі →"}
          </button>
        </div>
      )}

      <p className="muted keyboard-hint">
        1–4 — обрати відповідь · Enter — далі
      </p>
    </div>
  );
}

