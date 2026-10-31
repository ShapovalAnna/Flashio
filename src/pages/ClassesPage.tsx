import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { studentsCountLabel } from "../lib/cards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { ClassRoom } from "../types";

interface ClassWithCount extends ClassRoom {
  class_members?: { count: number }[];
}

export default function ClassesPage() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle(t("classes.title"));

  const userId = user?.id;
  const role = profile?.role;
  const isTeacher = role === "teacher";

  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId || !role) return;

    async function load(uid: string, teacher: boolean) {
      if (teacher) {
        // Викладач: класи, які він створив, з кількістю учнів
        const { data, error } = await supabase
          .from("classes")
          .select("*, class_members(count)")
          .eq("teacher_id", uid)
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          setLoadFailed(true);
        } else {
          setClasses(data ?? []);
        }
      } else {
        // Учень: класи, до яких він вступив
        const { data, error } = await supabase
          .from("class_members")
          .select("classes(*)")
          .eq("user_id", uid)
          .order("joined_at", { ascending: false });

        if (error) {
          console.error(error);
          setLoadFailed(true);
        } else {
          setClasses(
            (data ?? [])
              .map((row) => row.classes)
              .filter(Boolean) as unknown as ClassWithCount[],
          );
        }
      }
      setLoading(false);
    }

    load(userId, role === "teacher");
  }, [userId, role]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;

    const name = newName.trim();
    if (!name) {
      setFormError(t("classes.enterName"));
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const classId = crypto.randomUUID();
    const { error } = await supabase
      .from("classes")
      .insert({ id: classId, teacher_id: userId, name });

    setSubmitting(false);

    if (error) {
      console.error(error);
      setFormError(t("classes.createFailed"));
      return;
    }

    navigate(`/classes/${classId}`);
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!code.trim()) {
      setFormError(t("classes.enterCode"));
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Функція join_class у базі знаходить клас за кодом і додає учня
    const { data, error } = await supabase.rpc("join_class", {
      code: code.trim(),
    });

    setSubmitting(false);

    if (error) {
      console.error(error);
      // База повертає українське повідомлення, тому розпізнаємо його і перекладаємо
      setFormError(
        error.message.includes("не знайдено")
          ? t("classes.codeNotFound")
          : t("classes.joinFailed"),
      );
      return;
    }

    navigate(`/classes/${data}`);
  }

  return (
    <div>
      <h1>{t("classes.title")}</h1>

      {isTeacher ? (
        <form className="panel inline-form" onSubmit={handleCreate}>
          <input
            className="input"
            placeholder={t("classes.newPlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {t("classes.create")}
          </button>
        </form>
      ) : (
        <form className="panel inline-form" onSubmit={handleJoin}>
          <input
            className="input code-input"
            placeholder={t("classes.codePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {t("classes.join")}
          </button>
        </form>
      )}

      {formError && <p className="error">{formError}</p>}

      {loading && <p>{t("common.loading")}</p>}
      {loadFailed && <p className="error">{t("classes.loadError")}</p>}

      {!loading && !loadFailed && classes.length === 0 && (
        <div className="empty-state">
          <h2>
            {isTeacher
              ? t("classes.emptyTeacherTitle")
              : t("classes.emptyStudentTitle")}
          </h2>
          <p className="muted">
            {isTeacher
              ? t("classes.emptyTeacherText")
              : t("classes.emptyStudentText")}
          </p>
        </div>
      )}

      <div className="sets-grid">
        {classes.map((c) => (
          <Link key={c.id} to={`/classes/${c.id}`} className="set-tile">
            <h3>{c.name}</h3>
            {isTeacher && (
              <p className="muted">
                {studentsCountLabel(c.class_members?.[0]?.count ?? 0)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
