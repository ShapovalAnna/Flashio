import type { CardDraft } from "../types";
import { createEmptyCard } from "../lib/cards";

interface CardsEditorProps {
  cards: CardDraft[];
  onChange: (cards: CardDraft[]) => void;
}

export default function CardsEditor({ cards, onChange }: CardsEditorProps) {
  function updateCard(
    key: string,
    field: "term" | "definition",
    value: string,
  ) {
    onChange(
      cards.map((card) =>
        card.key === key ? { ...card, [field]: value } : card,
      ),
    );
  }

  function removeCard(key: string) {
    onChange(cards.filter((card) => card.key !== key));
  }

  function addCard() {
    onChange([...cards, createEmptyCard()]);
  }

  return (
    <div className="cards-editor">
      {cards.map((card, index) => (
        <div key={card.key} className="card-row">
          <span className="card-number">{index + 1}</span>
          <input
            className="input"
            placeholder="Слово (англійською)"
            value={card.term}
            onChange={(e) => updateCard(card.key, "term", e.target.value)}
          />
          <input
            className="input"
            placeholder="Переклад (українською)"
            value={card.definition}
            onChange={(e) => updateCard(card.key, "definition", e.target.value)}
          />
          <button
            type="button"
            className="icon-button"
            onClick={() => removeCard(card.key)}
            disabled={cards.length <= 1}
            aria-label="Видалити картку"
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" className="secondary-button" onClick={addCard}>
        + Додати картку
      </button>
    </div>
  );
}
