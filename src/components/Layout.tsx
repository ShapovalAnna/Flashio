import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Layout() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          Flashio
        </Link>

        {/* Кнопка меню видна лише на вузьких екранах */}
        <button
          className="menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          aria-expanded={menuOpen}
        >
          {menuOpen ? "✕" : "☰"}
        </button>

        {/* Клік по будь-якому пункту закриває меню на телефоні */}
        <nav
          className={menuOpen ? "open" : ""}
          onClick={() => setMenuOpen(false)}
        >
          <NavLink to="/" end>
            {t("nav.home")}
          </NavLink>

          {user ? (
            <>
              <NavLink to="/sets">{t("nav.sets")}</NavLink>
              <NavLink to="/classes">{t("nav.classes")}</NavLink>
              <span className="user-name">
                {profile?.username}
                {profile?.role === "teacher" && ` (${t("nav.teacher")})`}
              </span>
              <button className="link-button" onClick={handleSignOut}>
                {t("nav.logout")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">{t("nav.login")}</NavLink>
              <NavLink to="/register">{t("nav.register")}</NavLink>
            </>
          )}

          <LanguageSwitcher />
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
