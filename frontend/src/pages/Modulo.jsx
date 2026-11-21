import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { 
  generarDatosSinteticos, lagrange, newtonInterpolacion, 
  biseccion, newtonRaphson, 
  trapecio, romberg, rk4 
} from '../math/metodos.js'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Modulo() {
  const { casoId } = useParams()
  const [caso, setCaso] = useState(null)
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [error, setError] = useState(null)
  
  // Estados de UI y Resultados
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [graficoData, setGraficoData] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

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

  const cambiarEscenario = (tipo) => {
    setTipoSel(tipo)
    setResultado(null)
    setGraficoData(null)
    setGuardado(false)
    setError(null)
  }

  // 1. SOLO CALCULAR
  const calcularSimulacion = () => {
    if (!escenarioActual) return
    setCargando(true)
    setError(null)
    setGuardado(false)

    setTimeout(() => {
      try {
        const params = escenarioActual.parametros_json
        let resMetodo = {}
        let metodoUsado = ""
        let datosGrafico = null

        if (casoId === '4') {
          metodoUsado = "Lagrange y Newton"
          const esMalCondicionado = escenarioActual.tipo === 'MAL_CONDICIONADO'
          const n_nodos = esMalCondicionado ? 15 : (params.n_nodos || 8)
          const nodos = generarDatosSinteticos(n_nodos, params.ruido || 0)
          
          resMetodo = { 
            nodos_usados: n_nodos,
            y_lagrange: lagrange(nodos, 1.5), 
            y_newton: newtonInterpolacion(nodos, 1.5),
            nota: esMalCondicionado ? "Fenómeno de Runge (Mal condicionamiento)" : "Estable"
          }
          
          const xs = Array.from({ length: 100 }, (_, i) => (i * 2 * Math.PI) / 99)
          datosGrafico = {
            labels: xs.map(x => x.toFixed(2)),
            datasets: [
              { label: 'Real', data: xs.map(x => Math.sin(x) + 0.3 * Math.cos(2.5 * x)), borderColor: '#3b82f6', tension: 0.1, borderWidth: 3 },
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
          const dist_trap = trapecio((t) => params.v0 - params.a * t, 0, t_det, 100)
          const dist_romberg = romberg((t) => params.v0 - params.a * t, 0, t_det, 5)
          resMetodo = { t_det, v_final_rk4: resRK4[resRK4.length - 1].y, dist_trapecio: dist_trap, dist_romberg }
        } else if (casoId === '3') {
          metodoUsado = "RK4"
          resMetodo = { frecuencia: Math.sqrt(params.k / params.m) }
        }

        setResultado({ metodo: metodoUsado, datos: resMetodo })
        if (datosGrafico) setGraficoData(datosGrafico)
      } catch (err) {
        setError('Error de cálculo: ' + err.message)
      } finally {
        setCargando(false)
      }
    }, 500)
  }

  // 2. SOLO GUARDAR EN SUPABASE
  const guardarSimulacion = async () => {
    if (!resultado || !escenarioActual) return
    setGuardando(true)
    setError(null)

    try {
      const { data: simData, error: simError } = await supabase
        .from('simulacion').insert([{ escenario_id: escenarioActual.id, estado: 'EXITOSA' }]).select().single()
      if (simError) throw simError

      const { data: ejecData, error: ejecError } = await supabase
        .from('ejecucion_metodo').insert([{ simulacion_id: simData.id, metodo: resultado.metodo, convergio: true }]).select().single()
      if (ejecError) throw ejecError

      await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejecData.id, referencia: 'Calculado', valor_json: resultado.datos }])
      
      setGuardado(true)
    } catch (err) {
      setError('Error al guardar en BD: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <nav className="navbar animate-slide-down">
        <div><Link to="/" className="nav-link">← Inicio</Link></div>
        <div><Link to="/historial" className="nav-link">📁 Historial</Link></div>
      </nav>

      <div className="container animate-fade-in">
        <h1 className="page-title">{caso?.nombre ?? 'Cargando…'}</h1>
        
        {error && <div className="alert alert-error animate-fade-in">{error}</div>}

        {/* PANEL DE CONTROL */}
        <div className="panel glass-panel">
          <div className="controls">
            <label className="input-label">Seleccionar Escenario:</label>
            <div className="select-wrapper">
              <select value={tipoSel} onChange={e => cambiarEscenario(e.target.value)}>
                <option value="NORMAL">NORMAL</option>
                <option value="ESTRES">ESTRÉS</option>
                <option value="MAL_CONDICIONADO">MAL CONDICIONADO</option>
              </select>
            </div>
          </div>

          {escenarioActual && (
            <div className="params-box">
              <strong>Parámetros del modelo:</strong> 
              <code>{JSON.stringify(escenarioActual.parametros_json, null, 2)}</code>
            </div>
          )}

          <div className="button-group">
            <button 
              onClick={calcularSimulacion} 
              disabled={cargando} 
              className="btn btn-primary btn-hover-effect"
            >
              {cargando ? 'Procesando...' : 'Ejecutar Simulación'}
            </button>

            {resultado && !guardado && (
              <button 
                onClick={guardarSimulacion} 
                disabled={guardando} 
                className="btn btn-success btn-hover-effect animate-fade-in"
              >
                {guardando ? 'Guardando...' : 'Guardar en Historial'}
              </button>
            )}

            {guardado && (
              <span className="badge-success animate-fade-in">✅ Guardado exitoso</span>
            )}
          </div>
        </div>

        {/* RESULTADOS */}
        {resultado && (
          <div className="panel animate-slide-up">
            <h3>Resultados ({resultado.metodo})</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Variable</th><th>Valor Calculado</th></tr>
                </thead>
                <tbody>
                  {Object.entries(resultado.datos).map(([key, val]) => (
                    <tr key={key}>
                      <td>{key.replace(/_/g, ' ').toUpperCase()}</td>
                      <td>{typeof val === 'number' ? val.toFixed(6) : JSON.stringify(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* GRÁFICO */}
        {graficoData && (
          <div className="panel chart-panel animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <Line data={graficoData} options={{ maintainAspectRatio: false }} />
          </div>
        )}
      </div>
    </div>
  )
}