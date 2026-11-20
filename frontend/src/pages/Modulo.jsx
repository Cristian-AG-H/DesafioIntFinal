import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { generarDatosSinteticos, lagrange, newtonInterpolacion, biseccion, newtonRaphson, trapecio, simpson13, rk4, romberg } from '../math/metodos.js'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Modulo() {
  const { casoId } = useParams()
  const [caso, setCaso] = useState(null)
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  
  // Estado para controlar si ya se guardó ESTA simulación
  const [yaGuardado, setYaGuardado] = useState(false)
  
  const [resultado, setResultado] = useState(null)
  const [graficoData, setGraficoData] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('caso_estudio').select('*').eq('id', casoId).single(),
      supabase.from('escenario').select('*').eq('caso_id', casoId).order('tipo')
    ]).then(([casoRes, escRes]) => {
      if (casoRes.error) return setError(casoRes.error.message)
      setCaso(casoRes.data)
      setEscenarios(escRes.data)
    })
  }, [casoId])

  const escenarioActual = escenarios.find(e => e.tipo === tipoSel)

  // Al cambiar de escenario, reseteamos los resultados y el estado de guardado
  const cambiarEscenario = (tipo) => {
    setTipoSel(tipo)
    setResultado(null)
    setGraficoData(null)
    setYaGuardado(false)
    setError(null)
  }

  const ejecutarSimulacion = async (forzarGuardado = false) => {
    if (!escenarioActual) return
    setCargando(true)
    setError(null)

    try {
      const params = escenarioActual.parametros_json
      let resMetodo = {}
      let metodoUsado = ""
      let datosGrafico = null

      // Lógica Matemática
            if (casoId === '4') {
        metodoUsado = "Lagrange y Newton"
        
        // Si es MAL_CONDICIONADO, forzamos 15 nodos para demostrar el Fenómeno de Runge
        const esMalCondicionado = escenarioActual.tipo === 'MAL_CONDICIONADO'
        const n_nodos = esMalCondicionado ? 15 : (params.n_nodos || 8)
        
        const nodos = generarDatosSinteticos(n_nodos, params.ruido || 0)
        const x_eval = 1.5
        
        const val_lagrange = lagrange(nodos, x_eval)
        const val_newton = newtonInterpolacion(nodos, x_eval)
        
        resMetodo = { 
          nodos_usados: n_nodos,
          y_lagrange: val_lagrange, 
          y_newton: val_newton,
          nota: esMalCondicionado ? "Mal condicionamiento inducido (Nodos de Runge)" : "Estable"
        }
        
        const xs = Array.from({ length: 100 }, (_, i) => (i * 2 * Math.PI) / 99)
        datosGrafico = {
          labels: xs.map(x => x.toFixed(2)),
          datasets: [
            { label: 'Real', data: xs.map(x => Math.sin(x) + 0.3 * Math.cos(2.5 * x)), borderColor: '#2563eb', tension: 0.1, borderWidth: 3 },
            { label: 'Interpolado', data: xs.map(x => lagrange(nodos, x)), borderColor: '#ef4444', borderDash: [5, 5], tension: 0.1 }
          ]
        }
      } else if (casoId === '2') {
        metodoUsado = "Bisección y Newton-Raphson"
        const f = (t) => params.D0 + params.alpha * t + params.beta * t * t - params.D_umbral
        const df = (t) => params.alpha + 2 * params.beta * t
        const rBis = biseccion(f, 0, 100, 1e-5)
        const rNew = newtonRaphson(f, df, 10, 1e-5)
        resMetodo = { biseccion_raiz: rBis.raiz, newton_raiz: rNew.raiz }
      } else if (casoId === '1') {
        metodoUsado = "RK4, Trapecio y Romberg"
        const f_edo = (t, v) => -params.a 
        const t_det = params.v0 / params.a
        const resRK4 = rk4(f_edo, 0, params.v0, t_det, 0.1)
        
        const f_integral = (t) => params.v0 - params.a * t
        const dist_trap = trapecio(f_integral, 0, t_det, 100)
        const dist_romberg = romberg(f_integral, 0, t_det, 5)
        
        resMetodo = { 
          t_det: t_det.toFixed(4), 
          v_final_rk4: resRK4[resRK4.length - 1].y.toFixed(4), 
          dist_trapecio: dist_trap.toFixed(4),
          dist_romberg: dist_romberg.toFixed(4)
        }
      } else if (casoId === '3') {
        metodoUsado = "RK4"
        const w0 = Math.sqrt(params.k / params.m)
        resMetodo = { frecuencia: w0 }
      }

      setResultado({ metodo: metodoUsado, datos: resMetodo })
      if (datosGrafico) setGraficoData(datosGrafico)

      // Guardar en Supabase (Solo si no se ha guardado o si se fuerza)
      if (!yaGuardado || forzarGuardado) {
        const { data: simData, error: simError } = await supabase.from('simulacion').insert([{ escenario_id: escenarioActual.id, estado: 'EXITOSA' }]).select().single()
        if (simError) throw simError

        const { data: ejecData, error: ejecError } = await supabase.from('ejecucion_metodo').insert([{ simulacion_id: simData.id, metodo: metodoUsado, convergio: true }]).select().single()
        if (ejecError) throw ejecError

        await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejecData.id, referencia: 'Calculado', valor_json: resMetodo }])
        
        setYaGuardado(true)
      }

    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <nav className="navbar">
        <div><Link to="/">← Inicio</Link></div>
        <div><Link to="/historial">📁 Historial</Link></div>
      </nav>

      <div className="container">
        <h1>{caso?.nombre ?? 'Cargando…'}</h1>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="panel">
          <div className="controls">
            <strong>Escenario:</strong>
            <select value={tipoSel} onChange={e => cambiarEscenario(e.target.value)}>
              <option value="NORMAL">NORMAL</option>
              <option value="ESTRES">ESTRÉS</option>
              <option value="MAL_CONDICIONADO">MAL CONDICIONADO</option>
            </select>
          </div>

          {escenarioActual && (
            <>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <strong>Parámetros:</strong> <code>{JSON.stringify(escenarioActual.parametros_json)}</code>
              </p>
              
              <button 
                onClick={() => ejecutarSimulacion(false)} 
                disabled={cargando || yaGuardado} 
                className="btn-primary"
              >
                {cargando ? 'Calculando...' : yaGuardado ? 'Simulación Guardada' : 'Ejecutar y Guardar'}
              </button>

              {yaGuardado && (
                <button 
                  onClick={() => ejecutarSimulacion(true)} 
                  className="btn-outline" 
                  style={{ marginLeft: 10 }}
                  disabled={cargando}
                >
                  Forzar Nueva Ejecución
                </button>
              )}
            </>
          )}
        </div>

        {resultado && (
          <div className="panel">
            <h3>Resultados ({resultado.metodo})</h3>
            <table>
              <thead>
                <tr><th>Variable</th><th>Valor</th></tr>
              </thead>
              <tbody>
                {Object.entries(resultado.datos).map(([key, val]) => (
                  <tr key={key}><td>{key}</td><td>{typeof val === 'number' ? val.toFixed(6) : JSON.stringify(val)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {graficoData && (
          <div className="panel" style={{ maxWidth: '100%', height: '400px' }}>
            <Line data={graficoData} options={{ maintainAspectRatio: false }} />
          </div>
        )}
      </div>
    </div>
  )
}