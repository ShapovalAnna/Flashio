import { NavLink, Outlet } from 'react-router'

export default function Layout() {
    return (
        <div className="app">
            <header className="header">
                <span className="logo">Flashio</span>
                <nav>
                    <NavLink to="/" end>
                        Головна
                    </NavLink>
                    <NavLink to="/sets">Мої сети</NavLink>
                </nav>
            </header>
            <main className="content">
                <Outlet />
            </main>
        </div>
    )
}
