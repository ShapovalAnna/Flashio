import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { Role } from "../types";

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  useDocumentTitle(t("auth.registerTitle"));

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/sets" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(t("auth.errors.shortPassword"));
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
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

    if (!data.session) {
      setError(t("auth.errors.confirmEmail"));
      return;
    }

    navigate("/sets");
  }

  return (
    <div className="form-card">
      <h1>{t("auth.registerTitle")}</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          {t("auth.username")}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

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

        <fieldset className="radio-group">
          <legend>{t("auth.roleLegend")}</legend>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "student"}
              onChange={() => setRole("student")}
            />
            {t("auth.student")}
          </label>
          <label>
            <input
              type="radio"
              name="role"
              checked={role === "teacher"}
              onChange={() => setRole("teacher")}
            />
            {t("auth.teacher")}
          </label>
        </fieldset>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? t("auth.registering") : t("auth.registerButton")}
        </button>
      </form>

      <p>
        {t("auth.haveAccount")} <Link to="/login">{t("auth.loginButton")}</Link>
      </p>
    </div>
  );
}
