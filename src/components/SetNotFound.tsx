import { Link } from "react-router";

export default function SetNotFound() {
  return (
    <div>
      <h1>Сет не знайдено</h1>
      <p className="muted">Можливо, його видалили або у тебе немає доступу.</p>
      <Link to="/sets" className="back-link">
        ← Мої сети
      </Link>
    </div>
  );
}

