import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useSetWithCards } from "../hooks/useSetWithCards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { buildQuestions, type QuizQuestion } from "../lib/quiz";
import SetNotFound from "../components/SetNotFound";
import SpeakButton from "../components/SpeakButton";
import type { Card, StudySet } from "../types";

export default function QuizPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { set, cards, loading, notFound } = useSetWithCards(id);
  useDocumentTitle(set ? t("quiz.pageTitle", { title: set.title }) : undefined);

  if (loading) return <p>{t("common.loading")}</p>;
  if (notFound || !set) return <SetNotFound />;

  return (
    <div>
      <Link to={`/sets/${set.id}`} className="back-link">
        ← {set.title}
      </Link>
      <h1>{t("quiz.title")}</h1>

      {cards.length < 2 ? (
        <p className="muted">{t("quiz.needTwo")}</p>
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
  const { t } = useTranslation();

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
        <h2>{t("quiz.setupTitle")}</h2>

        <fieldset className="radio-group">
          <legend>{t("quiz.directionLegend")}</legend>
          <label>
            <input
              type="radio"
              name="direction"
              checked={!reverse}
              onChange={() => setReverse(false)}
            />
            {t("quiz.termToDef")}
          </label>
          <label>
            <input
              type="radio"
              name="direction"
              checked={reverse}
              onChange={() => setReverse(true)}
            />
            {t("quiz.defToTerm")}
          </label>
        </fieldset>

        <p className="muted">{t("quiz.questionsCount", { n: cards.length })}</p>

        {cards.length < 4 && <p className="notice">{t("quiz.fewCards")}</p>}

        <button className="primary-button" onClick={() => start(cards)}>
          {t("quiz.start")}
        </button>
      </div>
    );
  }

  // ---------- Результати ----------
  if (phase === "finished") {
    const total = results.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const mistakes = results.filter((r) => !r.isCorrect);

    let message = t("quiz.msgBad");
    if (percent >= 90) message = t("quiz.msgGreat");
    else if (percent >= 60) message = t("quiz.msgGood");

    return (
      <div className="quiz-results">
        <div className="score-card">
          <p className="muted">{t("quiz.yourResult")}</p>
          <p className="score-value">{percent}%</p>
          <p>{t("quiz.correctOf", { correct: correctCount, total })}</p>
          <p className="muted">{message}</p>

          <div className="study-actions">
            {mistakes.length > 0 && (
              <button
                className="primary-button"
                onClick={() => start(mistakes.map((m) => m.question.card))}
              >
                {t("quiz.repeatMistakes", { n: mistakes.length })}
              </button>
            )}
            <button className="secondary-button" onClick={() => start(cards)}>
              {t("quiz.again")}
            </button>
            <button
              className="secondary-button"
              onClick={() => setPhase("setup")}
            >
              {t("quiz.settings")}
            </button>
            <Link to={`/sets/${set.id}`} className="secondary-button">
              {t("quiz.toSet")}
            </Link>
          </div>
        </div>

        {mistakes.length > 0 && (
          <>
            <h2>{t("quiz.mistakes")}</h2>
            <div className="mistakes-list">
              {mistakes.map((m) => (
                <div key={m.question.card.id} className="mistake-item">
                  <strong>{m.question.prompt}</strong>
                  <p>
                    {t("quiz.correctLabel")}{" "}
                    <span className="feedback-correct">
                      {m.question.correct}
                    </span>
                  </p>
                  <p className="muted">
                    {t("quiz.yourAnswer", { answer: m.chosen })}
                  </p>
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
          {t("quiz.questionOf", {
            current: index + 1,
            total: questions.length,
          })}
        </span>
        <span className="muted">
          {t("quiz.correctSoFar", { value: correctCount })}
        </span>
      </div>

      <div className="progress">
        <div
          className="progress-bar"
          style={{ width: `${(index / questions.length) * 100}%` }}
        />
      </div>

      <div className="quiz-card">
        <p className="quiz-label">
          {reverse ? t("quiz.chooseTerm") : t("quiz.chooseDef")}
        </p>
        <div className="quiz-prompt-row">
          <p className="quiz-prompt">{current.prompt}</p>
          {/* Кнопка озвучення лише тоді, коли показуємо англійське слово */}
          {!reverse && (
            <SpeakButton
              text={current.prompt}
              lang={set.term_lang}
              size="large"
            />
          )}
        </div>
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
            <p className="feedback-correct">{t("quiz.feedbackCorrect")}</p>
          ) : (
            <p className="feedback-wrong">
              {t("quiz.feedbackWrong", { answer: current.correct })}
            </p>
          )}
          <button className="primary-button" onClick={next}>
            {index + 1 >= questions.length ? t("quiz.results") : t("quiz.next")}
          </button>
        </div>
      )}

      <p className="muted keyboard-hint">{t("quiz.keyboardHint")}</p>
    </div>
  );
}
