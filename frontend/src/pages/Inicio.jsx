import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Inicio() {
  const [casos, setCasos] = useState([])

  useEffect(() => {
    supabase.from('caso_estudio').select('*').order('id').then(({ data }) => setCasos(data || []))
  }, [])

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: 'var(--primary)' }}>SIMTELE-RISK</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Sistema de simulación educativa · Datos sintéticos
        </p>
      </div>

      <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px', borderRadius: '8px', display: 'inline-block', fontSize: '0.9rem', marginTop: '15px' }}>
          ⚠️ <strong>Aviso:</strong> Este sistema es estrictamente educativo. Utiliza datos sintéticos y no tiene conexión con equipos de control reales.
      </div>

      <div className="grid-cards">
        {casos.map(c => (
          <Link key={c.id} to={`/modulo/${c.id}`} className="card-modulo">
            <h3>{c.nombre}</h3>
            <p>Modelo {c.modelo_version}</p>
          </Link>
        ))}
      </div>
      
      <div style={{ textAlign: 'center', marginTop: 40 }}>
        <Link to="/historial" className="btn-outline" style={{ padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
          📁 Ver Historial de Simulaciones
        </Link>
      </div>
    </div>
  )
}