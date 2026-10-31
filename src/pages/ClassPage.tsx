import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel, studentsCountLabel } from "../lib/cards";
import type { ClassRoom } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface MemberRow {
  user_id: string;
  joined_at: string;
  profiles: { username: string } | null;
}

interface ClassSetRow {
  set_id: string;
  students_can_edit: boolean;
  sets: { id: string; title: string; cards: { count: number }[] } | null;
}

interface OwnSet {
  id: string;
  title: string;
}

export default function ClassPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const [classRoom, setClassRoom] = useState<ClassRoom | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classSets, setClassSets] = useState<ClassSetRow[]>([]);
  const [ownSets, setOwnSets] = useState<OwnSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Зміна version змушує перезавантажити дані після будь-якої дії
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  useDocumentTitle(classRoom?.name);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;

    async function load(classId: string, uid: string) {
      const { data: classData } = await supabase
        .from("classes")
        .select("*")
        .eq("id", classId)
        .maybeSingle();

      if (cancelled) return;

      if (!classData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const teacher = classData.teacher_id === uid;

      const [membersRes, setsRes, ownRes] = await Promise.all([
        supabase
          .from("class_members")
          .select("user_id, joined_at, profiles(username)")
          .eq("class_id", classId)
          .order("joined_at"),
        supabase
          .from("class_sets")
          .select("set_id, students_can_edit, sets(id, title, cards(count))")
          .eq("class_id", classId)
          .order("assigned_at"),
        teacher
          ? supabase
              .from("sets")
              .select("id, title")
              .eq("owner_id", uid)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as OwnSet[] }),
      ]);

      if (cancelled) return;

      setClassRoom(classData);
      setMembers((membersRes.data ?? []) as unknown as MemberRow[]);
      setClassSets((setsRes.data ?? []) as unknown as ClassSetRow[]);
      setOwnSets(ownRes.data ?? []);
      setLoading(false);
    }

    load(id, userId);

    return () => {
      cancelled = true;
    };
  }, [id, userId, version]);

  if (loading) return <p>Завантаження...</p>;

  if (notFound || !classRoom) {
    return (
      <div>
        <h1>Клас не знайдено</h1>
        <p className="muted">
          Можливо, його видалили або ти не є його учасником.
        </p>
        <Link to="/classes" className="back-link">
          ← Мої класи
        </Link>
      </div>
    );
  }

  const room = classRoom;
  const isTeacher = room.teacher_id === userId;
  const availableSets = ownSets.filter(
    (s) => !classSets.some((cs) => cs.set_id === s.id),
  );

  // ---------- Дії викладача ----------

  async function copyCode() {
    await navigator.clipboard.writeText(room.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function assignSet() {
    if (!selectedSetId) return;

    const { error } = await supabase
      .from("class_sets")
      .insert({ class_id: room.id, set_id: selectedSetId });

    if (error) {
      console.error(error);
      alert("Не вдалося додати сет");
      return;
    }
    setSelectedSetId("");
    refresh();
  }

  async function toggleEdit(row: ClassSetRow) {
    const { error } = await supabase
      .from("class_sets")
      .update({ students_can_edit: !row.students_can_edit })
      .eq("class_id", room.id)
      .eq("set_id", row.set_id);

    if (error) {
      console.error(error);
      alert("Не вдалося змінити налаштування");
      return;
    }
    refresh();
  }

  async function removeSet(row: ClassSetRow) {
    if (
      !window.confirm(
        `Прибрати сет «${row.sets?.title}» з класу? Сам сет не видалиться.`,
      )
    )
      return;

    const { error } = await supabase
      .from("class_sets")
      .delete()
      .eq("class_id", room.id)
      .eq("set_id", row.set_id);

    if (error) {
      console.error(error);
      alert("Не вдалося прибрати сет");
      return;
    }
    refresh();
  }

  async function removeMember(member: MemberRow) {
    if (
      !window.confirm(`Видалити учня «${member.profiles?.username}» з класу?`)
    )
      return;

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", room.id)
      .eq("user_id", member.user_id);

    if (error) {
      console.error(error);
      alert("Не вдалося видалити учня");
      return;
    }
    refresh();
  }

  async function deleteClass() {
    if (
      !window.confirm(
        `Видалити клас «${room.name}»? Сети викладача залишаться.`,
      )
    )
      return;

    const { error } = await supabase.from("classes").delete().eq("id", room.id);
    if (error) {
      console.error(error);
      alert("Не вдалося видалити клас");
      return;
    }
    navigate("/classes");
  }

  // ---------- Дія учня ----------

  async function leaveClass() {
    if (!window.confirm(`Вийти з класу «${room.name}»?`)) return;

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", room.id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert("Не вдалося вийти з класу");
      return;
    }
    navigate("/classes");
  }

  return (
    <div>
      <Link to="/classes" className="back-link">
        ← Мої класи
      </Link>

      <div className="page-header">
        <div>
          <h1>{room.name}</h1>
          <p className="muted">{studentsCountLabel(members.length)}</p>
        </div>

        {isTeacher ? (
          <button className="danger-button" onClick={deleteClass}>
            Видалити клас
          </button>
        ) : (
          <button className="danger-button" onClick={leaveClass}>
            Вийти з класу
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="panel join-code-card">
          <div>
            <p className="muted">Код для вступу учнів</p>
            <p className="join-code">{room.join_code}</p>
          </div>
          <button className="secondary-button" onClick={copyCode}>
            {copied ? "Скопійовано ✓" : "Копіювати"}
          </button>
        </div>
      )}

      {/* ---------- Сети класу ---------- */}
      <section className="class-section">
        <h2>Сети класу</h2>

        {isTeacher &&
          (availableSets.length > 0 ? (
            <div className="inline-form">
              <select
                className="input"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
              >
                <option value="">Обери свій сет...</option>
                {availableSets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <button
                className="primary-button"
                onClick={assignSet}
                disabled={!selectedSetId}
              >
                Додати до класу
              </button>
            </div>
          ) : (
            <p className="muted">
              Усі твої сети вже в цьому класі.{" "}
              <Link to="/sets/new">Створи новий сет</Link>
            </p>
          ))}

        {classSets.length === 0 ? (
          <p className="muted">
            {isTeacher
              ? "Додай сети, щоб учні могли їх вивчати."
              : "Викладач ще не додав сетів до цього класу."}
          </p>
        ) : (
          <div className="class-sets-list">
            {classSets.map(
              (row) =>
                row.sets && (
                  <div key={row.set_id} className="class-set-row">
                    <Link to={`/sets/${row.set_id}`} className="class-set-info">
                      <strong>{row.sets.title}</strong>
                      <span className="muted">
                        {cardsCountLabel(row.sets.cards[0]?.count ?? 0)}
                      </span>
                    </Link>

                    {isTeacher ? (
                      <div className="class-set-actions">
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={row.students_can_edit}
                            onChange={() => toggleEdit(row)}
                          />
                          Учні можуть редагувати
                        </label>
                        <button
                          className="icon-button"
                          onClick={() => removeSet(row)}
                          aria-label="Прибрати сет з класу"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      row.students_can_edit && (
                        <span className="badge">Можна редагувати</span>
                      )
                    )}
                  </div>
                ),
            )}
          </div>
        )}
      </section>

      {/* ---------- Учні (бачить лише викладач) ---------- */}
      {isTeacher && (
        <section className="class-section">
          <h2>Учні</h2>

          {members.length === 0 ? (
            <p className="muted">
              Поки ніхто не вступив. Поділися з учнями кодом{" "}
              <strong>{room.join_code}</strong>.
            </p>
          ) : (
            <div className="members-list">
              {members.map((m) => (
                <div key={m.user_id} className="member-row">
                  <span>{m.profiles?.username ?? "Учень"}</span>
                  <button
                    className="link-button danger-link"
                    onClick={() => removeMember(m)}
                  >
                    Видалити
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
