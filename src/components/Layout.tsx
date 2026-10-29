import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/authContext";

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          Flashio
        </Link>
        <nav>
          <NavLink to="/" end>
            Головна
          </NavLink>

          {user ? (
            <>
              <NavLink to="/sets">Мої сети</NavLink>
              <NavLink to="/classes">Класи</NavLink>
              <span className="user-name">
                {profile?.username}
                {profile?.role === "teacher" && " (викладач)"}
              </span>
              <button className="link-button" onClick={handleSignOut}>
                Вийти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Вхід</NavLink>
              <NavLink to="/register">Реєстрація</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
