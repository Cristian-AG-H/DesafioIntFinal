import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Historial() {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    // Hacemos un join para traer datos de simulación, ejecución, escenario y caso
    const fetchHistorial = async () => {
      const { data, error } = await supabase
        .from('simulacion')
        .select(`
          id,
          fecha,
          estado,
          escenario:escenario_id ( tipo, caso_id, caso_estudio ( nombre ) ),
          ejecucion_metodo ( metodo, resultado_resumen ( valor_json ) )
        `)
        .order('fecha', { ascending: false })

      if (!error) setHistorial(data)
      setCargando(false)
    }
    fetchHistorial()
  }, [])

  return (
    <div>
      <nav className="navbar">
        <div><Link to="/">← Inicio</Link></div>
        <div><strong>Historial de Simulaciones</strong></div>
      </nav>

      <div className="container">
        {cargando ? (
          <p>Cargando historial...</p>
        ) : historial.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center' }}>
            <p>No hay simulaciones guardadas aún.</p>
            <Link to="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Ir a los módulos</Link>
          </div>
        ) : (
          <div className="panel">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Escenario</th>
                  <th>Método</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(sim => {
                  const ejec = sim.ejecucion_metodo[0] || {}
                  return (
                    <tr key={sim.id}>
                      <td>{new Date(sim.fecha).toLocaleString()}</td>
                      <td>{sim.escenario?.caso_estudio?.nombre || 'N/A'}</td>
                      <td>
                        <span style={{ 
                          background: sim.escenario?.tipo === 'NORMAL' ? '#e0e7ff' : sim.escenario?.tipo === 'ESTRES' ? '#fef3c7' : '#fee2e2',
                          padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 'bold'
                        }}>
                          {sim.escenario?.tipo}
                        </span>
                      </td>
                      <td>{ejec.metodo || '-'}</td>
                      <td>
                        <Link to={`/modulo/${sim.escenario?.caso_id}`} style={{ color: 'var(--primary)' }}>
                          Ir al Módulo
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}