import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import type { Role } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useDocumentTitle("Реєстрація");

  if (user) {
    return <Navigate to="/sets" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Пароль має містити щонайменше 6 символів");
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.trim(), role },
      },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate("/sets");
  }

  return (
    <div className="form-card">
      <h1>Реєстрація</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Ім'я користувача
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <fieldset className="radio-group">
          <legend>Я реєструюся як</legend>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "student"}
              onChange={() => setRole("student")}
            />
            Учень
          </label>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "teacher"}
              onChange={() => setRole("teacher")}
            />
            Викладач
          </label>
        </fieldset>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Створення акаунта..." : "Зареєструватися"}
        </button>
      </form>

      <p>
        Вже маєш акаунт? <Link to="/login">Увійти</Link>
      </p>
    </div>
  );
}
