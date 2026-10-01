import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div>
      <h1>Сторінку не знайдено</h1>
      <Link to="/">Повернутися на головну</Link>
    </div>
  );
}
