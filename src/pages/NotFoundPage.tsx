import { Link } from "react-router";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Сторінку не знайдено");

  return (
    <div>
      <h1>Сторінку не знайдено</h1>
      <Link to="/">Повернутися на головну</Link>
    </div>
  );
}
