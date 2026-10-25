import type { CardDraft } from "../types";

export function createEmptyCard(): CardDraft {
  return { key: crypto.randomUUID(), term: "", definition: "" };
}

// Правильне закінчення: 1 картка, 2 картки, 5 карток
export function cardsCountLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return `${n} картка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} картки`;
  return `${n} карток`;
}
export interface ValidCard {
  id?: string;
  term: string;
  definition: string;
}

// Перевірка карток перед збереженням
export function validateCards(drafts: CardDraft[]): {
  cards: ValidCard[];
  error: string | null;
} {
  const cards = drafts
    .map((draft) => ({
      id: draft.id,
      term: draft.term.trim(),
      definition: draft.definition.trim(),
    }))
    .filter((card) => card.term || card.definition);

  if (cards.some((card) => !card.term || !card.definition)) {
    return {
      cards,
      error: "У кожної картки мають бути заповнені обидві сторони",
    };
  }
  if (cards.length < 2) {
    return { cards, error: "Додай щонайменше 2 картки" };
  }
  return { cards, error: null };
}

// Перемішування масиву (алгоритм Фішера–Єйтса)
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
