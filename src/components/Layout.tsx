import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../context/authContext'

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
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
              aria-label={menuOpen ? 'Закрити меню' : 'Відкрити меню'}
              aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          {/* Клік по будь-якому пункту закриває меню на телефоні */}
          <nav className={menuOpen ? 'open' : ''} onClick={() => setMenuOpen(false)}>
            <NavLink to="/" end>
              Головна
            </NavLink>

            {user ? (
                <>
                  <NavLink to="/sets">Мої сети</NavLink>
                  <NavLink to="/classes">Класи</NavLink>
                  <span className="user-name">
                {profile?.username}
                    {profile?.role === 'teacher' && ' (викладач)'}
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
  )
}