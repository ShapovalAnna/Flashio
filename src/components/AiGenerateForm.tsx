import { useState } from "react";
import type { FormEvent } from "react";
import { generateSet } from "../services/ai";
import type { GeneratedSet, Level } from "../types";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const COUNTS = [10, 15, 20, 25, 30];

const EXAMPLES = [
  "Подорожі та аеропорт",
  "Емоції та почуття",
  "Фразові дієслова з get",
  "Лексика для співбесіди",
];

interface AiGenerateFormProps {
  onGenerated: (result: GeneratedSet) => void;
}

export default function AiGenerateForm({ onGenerated }: AiGenerateFormProps) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<Level>("B1");
  const [count, setCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!topic.trim()) {
      setError("Опиши, які слова потрібні");
      return;
    }

    setLoading(true);
    try {
      const result = await generateSet({ topic: topic.trim(), level, count });
      onGenerated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сталася помилка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="set-form ai-form" onSubmit={handleSubmit}>
      <label className="field">
        Які слова тобі потрібні?
        <textarea
          className="input"
          rows={3}
          maxLength={300}
          placeholder="Наприклад: слова на тему подорожей літаком"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </label>

      <div className="examples">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="example-chip"
            onClick={() => setTopic(example)}
          >
            {example}
          </button>
        ))}
      </div>

      <div className="ai-options">
        <label className="field">
          Рівень
          <select
            className="input"
            value={level}
            onChange={(e) => setLevel(e.target.value as Level)}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Кількість слів
          <select
            className="input"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "✨ Генерую..." : "✨ Згенерувати"}
        </button>
      </div>

      {loading && <p className="muted">Зазвичай це займає кілька секунд.</p>}
    </form>
  );
}
