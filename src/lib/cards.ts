import type { CardDraft } from "../types";
import i18n from "../i18n";

export function createEmptyCard(): CardDraft {
  return { key: crypto.randomUUID(), term: "", definition: "" };
}

// 1 картка / 2 картки / 5 карток, або 1 card / 5 cards — залежно від мови
export function cardsCountLabel(n: number): string {
  return i18n.t("common.cards", { count: n });
}

// 1 учень / 2 учні / 5 учнів, або 1 student / 5 students
export function studentsCountLabel(n: number): string {
  return i18n.t("common.students", { count: n });
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
    return { cards, error: i18n.t("validation.bothSides") };
  }
  if (cards.length < 2) {
    return { cards, error: i18n.t("validation.minCards") };
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
