import type { Card } from "../types";
import { shuffle } from "./cards";

export interface QuizQuestion {
  card: Card;
  prompt: string; // що показуємо в питанні
  correct: string; // правильна відповідь
  options: string[]; // усі варіанти, перемішані
}

/**
 * Створює питання для тесту.
 * cards — картки, з яких будуть питання;
 * pool — усі картки сету, з яких беруться неправильні варіанти;
 * reverse — true, якщо показуємо переклад і просимо обрати слово.
 */
export function buildQuestions(
  cards: Card[],
  pool: Card[],
  reverse: boolean,
): QuizQuestion[] {
  const answerOf = (card: Card) => (reverse ? card.term : card.definition);
  const promptOf = (card: Card) => (reverse ? card.definition : card.term);

  // Унікальні відповіді, щоб варіанти не повторювалися
  const allAnswers = Array.from(new Set(pool.map(answerOf)));

  return shuffle(cards).map((card) => {
    const correct = answerOf(card);
    const distractors = shuffle(
      allAnswers.filter((answer) => answer !== correct),
    ).slice(0, 3);

    return {
      card,
      prompt: promptOf(card),
      correct,
      options: shuffle([correct, ...distractors]),
    };
  });
}
