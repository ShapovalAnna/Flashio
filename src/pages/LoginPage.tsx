import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  useDocumentTitle(t("auth.loginTitle"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/sets" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);

    if (signInError) {
      if (signInError.message.includes("Email not confirmed")) {
        setError(t("auth.errors.notConfirmed"));
      } else if (signInError.message.includes("Invalid login credentials")) {
        setError(t("auth.errors.invalid"));
      } else {
        setError(signInError.message);
      }
      return;
    }

    navigate("/sets");
  }

  return (
    <div className="form-card">
      <h1>{t("auth.loginTitle")}</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          {t("auth.email")}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? t("auth.loggingIn") : t("auth.loginButton")}
        </button>
      </form>

      <p>
        {t("auth.noAccount")}{" "}
        <Link to="/register">{t("auth.registerButton")}</Link>
      </p>
    </div>
  );
}
