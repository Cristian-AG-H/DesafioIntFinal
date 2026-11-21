import { Link } from 'react-router-dom'
import './Layout.css'

export default function Layout({ children }) {
  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">SIMTELE-RISK</div>
        <div className="nav-links">
          <Link to="/">Inicio</Link>
          <Link to="/historial">Historial</Link>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  )
}