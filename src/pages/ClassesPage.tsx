import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { studentsCountLabel } from "../lib/cards";
import type { ClassRoom } from "../types";

interface ClassWithCount extends ClassRoom {
  class_members?: { count: number }[];
}

export default function ClassesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const userId = user?.id;
  const role = profile?.role;
  const isTeacher = role === "teacher";

  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userId || !role) return;

    async function load(uid: string, teacher: boolean) {
      if (teacher) {
        // Викладач: класи, які він створив, з кількістю учнів
        const { data, error: loadError } = await supabase
          .from("classes")
          .select("*, class_members(count)")
          .eq("teacher_id", uid)
          .order("created_at", { ascending: false });

        if (loadError) {
          console.error(loadError);
          setError("Не вдалося завантажити класи");
        } else {
          setClasses(data ?? []);
        }
      } else {
        // Учень: класи, до яких він вступив
        const { data, error: loadError } = await supabase
          .from("class_members")
          .select("classes(*)")
          .eq("user_id", uid)
          .order("joined_at", { ascending: false });

        if (loadError) {
          console.error(loadError);
          setError("Не вдалося завантажити класи");
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
      setFormError("Введи назву класу");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const classId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from("classes")
      .insert({ id: classId, teacher_id: userId, name });

    setSubmitting(false);

    if (insertError) {
      console.error(insertError);
      setFormError("Не вдалося створити клас");
      return;
    }

    navigate(`/classes/${classId}`);
  }

  async function handleJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!code.trim()) {
      setFormError("Введи код класу");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    // Функція join_class у базі знаходить клас за кодом і додає учня
    const { data, error: joinError } = await supabase.rpc("join_class", {
      code: code.trim(),
    });

    setSubmitting(false);

    if (joinError) {
      console.error(joinError);
      setFormError(joinError.message);
      return;
    }

    navigate(`/classes/${data}`);
  }

  return (
    <div>
      <h1>Мої класи</h1>

      {isTeacher ? (
        <form className="panel inline-form" onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="Назва нового класу, наприклад: 9-Б, англійська"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            Створити клас
          </button>
        </form>
      ) : (
        <form className="panel inline-form" onSubmit={handleJoin}>
          <input
            className="input code-input"
            placeholder="Код класу від викладача"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            Вступити
          </button>
        </form>
      )}

      {formError && <p className="error">{formError}</p>}

      {loading && <p>Завантаження...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && classes.length === 0 && (
        <div className="empty-state">
          <h2>
            {isTeacher
              ? "У тебе ще немає класів"
              : "Ти ще не вступив до жодного класу"}
          </h2>
          <p className="muted">
            {isTeacher
              ? "Створи клас і поділися кодом з учнями."
              : "Попроси викладача дати тобі код класу."}
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
