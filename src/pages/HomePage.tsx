import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function HomePage() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Помилка підключення до Supabase:", error);
      } else {
        console.log("Supabase підключено ✅", data);
      }
    });
  }, []);

  return (
    <div>
      <h1>Ласкаво просимо до Flashio</h1>
      <p>Створюй сети карток і вивчай іноземні мови разом зі ШІ.</p>
    </div>
  );
}
