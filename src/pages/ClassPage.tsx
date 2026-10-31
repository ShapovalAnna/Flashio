import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/authContext";
import { cardsCountLabel, studentsCountLabel } from "../lib/cards";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { ClassRoom } from "../types";

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
  const { t } = useTranslation();
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
      // Supabase повертає вкладені записи як об'єкти, тому явно вказуємо тип
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

  if (loading) return <p>{t("common.loading")}</p>;

  if (notFound || !classRoom) {
    return (
      <div>
        <h1>{t("classes.notFoundTitle")}</h1>
        <p className="muted">{t("classes.notFoundText")}</p>
        <Link to="/classes" className="back-link">
          {t("classes.back")}
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
      alert(t("classes.errors.addSet"));
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
      alert(t("classes.errors.toggle"));
      return;
    }
    refresh();
  }

  async function removeSet(row: ClassSetRow) {
    if (
      !window.confirm(t("classes.confirmRemoveSet", { title: row.sets?.title }))
    )
      return;

    const { error } = await supabase
      .from("class_sets")
      .delete()
      .eq("class_id", room.id)
      .eq("set_id", row.set_id);

    if (error) {
      console.error(error);
      alert(t("classes.errors.removeSet"));
      return;
    }
    refresh();
  }

  async function removeMember(member: MemberRow) {
    if (
      !window.confirm(
        t("classes.confirmRemoveStudent", { name: member.profiles?.username }),
      )
    )
      return;

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", room.id)
      .eq("user_id", member.user_id);

    if (error) {
      console.error(error);
      alert(t("classes.errors.removeStudent"));
      return;
    }
    refresh();
  }

  async function deleteClass() {
    if (!window.confirm(t("classes.confirmDelete", { name: room.name })))
      return;

    const { error } = await supabase.from("classes").delete().eq("id", room.id);
    if (error) {
      console.error(error);
      alert(t("classes.errors.delete"));
      return;
    }
    navigate("/classes");
  }

  // ---------- Дія учня ----------

  async function leaveClass() {
    if (!window.confirm(t("classes.confirmLeave", { name: room.name }))) return;

    const { error } = await supabase
      .from("class_members")
      .delete()
      .eq("class_id", room.id)
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      alert(t("classes.errors.leave"));
      return;
    }
    navigate("/classes");
  }

  return (
    <div>
      <Link to="/classes" className="back-link">
        {t("classes.back")}
      </Link>

      <div className="page-header">
        <div>
          <h1>{room.name}</h1>
          <p className="muted">{studentsCountLabel(members.length)}</p>
        </div>

        {isTeacher ? (
          <button className="danger-button" onClick={deleteClass}>
            {t("classes.deleteClass")}
          </button>
        ) : (
          <button className="danger-button" onClick={leaveClass}>
            {t("classes.leaveClass")}
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="panel join-code-card">
          <div>
            <p className="muted">{t("classes.joinCode")}</p>
            <p className="join-code">{room.join_code}</p>
          </div>
          <button className="secondary-button" onClick={copyCode}>
            {copied ? t("classes.copied") : t("classes.copy")}
          </button>
        </div>
      )}

      {/* ---------- Сети класу ---------- */}
      <section className="class-section">
        <h2>{t("classes.setsTitle")}</h2>

        {isTeacher &&
          (availableSets.length > 0 ? (
            <div className="inline-form">
              <select
                className="input"
                value={selectedSetId}
                onChange={(e) => setSelectedSetId(e.target.value)}
              >
                <option value="">{t("classes.chooseSet")}</option>
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
                {t("classes.addToClass")}
              </button>
            </div>
          ) : (
            <p className="muted">
              {t("classes.allSetsAdded")}{" "}
              <Link to="/sets/new">{t("classes.createNewSet")}</Link>
            </p>
          ))}

        {classSets.length === 0 ? (
          <p className="muted">
            {isTeacher
              ? t("classes.noSetsTeacher")
              : t("classes.noSetsStudent")}
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
                          {t("classes.studentsCanEdit")}
                        </label>
                        <button
                          className="icon-button"
                          onClick={() => removeSet(row)}
                          aria-label={t("classes.removeSet")}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      row.students_can_edit && (
                        <span className="badge">
                          {t("classes.canEditBadge")}
                        </span>
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
          <h2>{t("classes.studentsTitle")}</h2>

          {members.length === 0 ? (
            <p className="muted">
              {t("classes.noStudents")} <strong>{room.join_code}</strong>
            </p>
          ) : (
            <div className="members-list">
              {members.map((m) => (
                <div key={m.user_id} className="member-row">
                  <span>{m.profiles?.username ?? t("classes.student")}</span>
                  <button
                    className="link-button danger-link"
                    onClick={() => removeMember(m)}
                  >
                    {t("classes.remove")}
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
