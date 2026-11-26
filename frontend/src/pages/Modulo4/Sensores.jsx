import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout.jsx'
import { lagrange, newtonInterpolacion, splineCubico } from '../../math/metodos.js'
import { MathComponent } from 'mathjax-2025'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import './Sensores.css'
import { supabase } from '../../lib/supabase.js'
import { sanitizeJson } from '../../lib/utils.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Sensores() {
  const [searchParams] = useSearchParams()
  const simulacionIdUrl = searchParams.get('simulacion')
  const escenarioUrl = searchParams.get('escenario')

  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [params, setParams] = useState({ n_nodos: 8, ruido: 0.0, x_eval: 1.5 })

  const [activeTab, setActiveTab] = useState('grafica')
  const [resultado, setResultado] = useState(null)
  const [graficoData, setGraficoData] = useState(null)
  const [tablaNewton, setTablaNewton] = useState([])

  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let activo = true

    const cargarEscenarios = async () => {
      const { data, error: errFetch } = await supabase
        .from('escenario')
        .select('*')
        .eq('caso_id', 4)
        .order('tipo')

      if (!activo) return

      if (errFetch) {
        setError(`Error al cargar escenarios: ${errFetch.message}`)
        return
      }

      if (data && data.length > 0) {
        setEscenarios(data)
        // Solo cargamos el NORMAL si NO venimos del historial
        if (!simulacionIdUrl) {
          const normal = data.find(e => e.tipo === 'NORMAL') || data[0]
          setTipoSel(normal.tipo)
          setParams({ x_eval: 1.5, ...(normal.parametros_json || {}) })
        }
      }
    }

    cargarEscenarios()
    return () => {
      activo = false
    }
  }, [simulacionIdUrl])

  // Efecto para cargar desde Historial
  useEffect(() => {
    if (!simulacionIdUrl || escenarios.length === 0) return

    const cargarDesdeHistorial = async () => {
      try {
        const { data, error: errDb } = await supabase
          .from('simulacion')
          .select('escenario(parametros_json)')
          .eq('id', simulacionIdUrl)
          .single()

        if (errDb) throw errDb

        if (data?.escenario?.parametros_json) {
          const paramsGuardados = data.escenario.parametros_json
          // Nos aseguramos de mantener el x_eval por defecto si no existe en los guardados
          setParams({ x_eval: 1.5, ...paramsGuardados })
          if (escenarioUrl) setTipoSel(escenarioUrl)
          
          calcular({ x_eval: 1.5, ...paramsGuardados })
        }
      } catch (err) {
        console.error("Error al cargar simulación del historial:", err)
        setError("No se pudieron recuperar los datos del historial.")
      }
    }

    cargarDesdeHistorial()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulacionIdUrl, escenarios])

  const limpiarUrl = () => {
    if (simulacionIdUrl || escenarioUrl) {
      window.history.replaceState({}, '', '/modulo/4')
    }
  }

  const cambiarEscenario = (tipo) => {
    setTipoSel(tipo)
    const esc = escenarios.find(e => e.tipo === tipo)
    if (esc) {
      setParams({ x_eval: 1.5, ...(esc.parametros_json || {}) })
    }
    setResultado(null)
    setGraficoData(null)
    setTablaNewton([])
    setError(null)
    setGuardado(false)
    limpiarUrl()
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const parsed = parseFloat(value)
    setParams(prev => ({
      ...prev,
      [name]: Number.isNaN(parsed) ? 0 : parsed
    }))
    setGuardado(false)
    limpiarUrl()
  }

  const calcular = (paramsParaCalcular = params) => {
    setError(null)
    setGuardado(false)
    try {
      const n_nodos = Number(paramsParaCalcular.n_nodos)
      const ruido = Number(paramsParaCalcular.ruido)
      const x_eval = Number(paramsParaCalcular.x_eval)

      if (!Number.isFinite(n_nodos) || n_nodos < 2) {
        throw new Error('El número de nodos debe ser al menos 2.')
      }

      // 1. Generar nodos
      const nodos = []
      for (let i = 0; i < n_nodos; i++) {
        const t = (i * 2 * Math.PI) / (n_nodos - 1)
        let y = Math.sin(t) + 0.3 * Math.cos(2.5 * t)
        if (ruido > 0) y += (Math.random() - 0.5) * ruido
        nodos.push({ t, y })
      }

      // 2. Evaluar métodos
      const y_real = Math.sin(x_eval) + 0.3 * Math.cos(2.5 * x_eval)
      const y_lagrange = lagrange(nodos, x_eval)
      const res_newton = newtonInterpolacion(nodos, x_eval)
      const y_spline = splineCubico(nodos, x_eval)

      setResultado({
        real: y_real,
        lagrange: y_lagrange,
        newton: res_newton.valor,
        spline: y_spline,
        error_lagrange: Math.abs(y_real - y_lagrange),
        error_newton: Math.abs(y_real - res_newton.valor),
        error_spline: Math.abs(y_real - y_spline)
      })
      setTablaNewton(res_newton.iteraciones || [])

      // 3. Gráfico
      const xs = Array.from({ length: 100 }, (_, i) => (i * 2 * Math.PI) / 99)
      setGraficoData({
        labels: xs.map(x => x.toFixed(2)),
        datasets: [
          {
            label: 'Señal Real',
            data: xs.map(x => Math.sin(x) + 0.3 * Math.cos(2.5 * x)),
            borderColor: '#3b82f6',
            borderWidth: 3,
            tension: 0.1
          },
          {
            label: 'Lagrange',
            data: xs.map(x => lagrange(nodos, x)),
            borderColor: '#ef4444',
            borderDash: [5, 5],
            tension: 0.1
          },
          {
            label: 'Spline Cúbico',
            data: xs.map(x => splineCubico(nodos, x)),
            borderColor: '#10b981',
            borderWidth: 2,
            tension: 0.1
          }
        ]
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const guardar = async () => {
    if (!resultado) return

    const escActual = escenarios.find(e => e.tipo === tipoSel)
    if (!escActual?.id) {
      const msg = 'No se encontró el escenario seleccionado en la base de datos.'
      setError(msg)
      alert(msg)
      return
    }

    setGuardando(true)
    setError(null)

    try {
      const parametrosModificados = {
        n_nodos: Number(params.n_nodos),
        ruido: Number(params.ruido),
        x_eval: Number(params.x_eval)
      }

      const { data: sim, error: errSim } = await supabase
        .from('simulacion')
        .insert([{ escenario_id: escActual.id, estado: 'EXITOSA' }])
        .select('id')
        .single()

      if (errSim) throw new Error(`simulacion: ${errSim.message}`)

      const { data: ejec, error: errEjec } = await supabase
        .from('ejecucion_metodo')
        .insert([
          {
            simulacion_id: sim.id,
            metodo: 'Lagrange, Newton, Splines',
            convergio: true
          }
        ])
        .select('id')
        .single()

      if (errEjec) throw new Error(`ejecucion_metodo: ${errEjec.message}`)

      // LIMPIAMOS EL JSON ANTES DE GUARDAR
      const valorLimpio = sanitizeJson({
        escenario_tipo: tipoSel,
        parametros_modificados: parametrosModificados,
        resultado
      })

      const metricaLimpia = sanitizeJson({
        error_lagrange: resultado.error_lagrange,
        error_newton: resultado.error_newton,
        error_spline: resultado.error_spline
      })

      const { error: errRes } = await supabase
        .from('resultado_resumen')
        .insert([
          {
            ejecucion_id: ejec.id,
            referencia: 'y_ref(t) = sin(t) + 0.3*cos(2.5t)',
            valor_json: valorLimpio,
            metrica_error: metricaLimpia
          }
        ])

      if (errRes) throw new Error(`resultado_resumen: ${errRes.message}`)

      setGuardado(true)
    } catch (e) {
      console.error(e)
      setError(`Error al guardar: ${e.message}`)
      alert(`Error al guardar: ${e.message}`)
    } finally {
      setGuardando(false)
    }
  }

  const tabStyle = (tabName) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #10b981' : '3px solid transparent',
    color: activeTab === tabName ? '#fff' : '#9ca3af',
    fontWeight: activeTab === tabName ? 'bold' : 'normal',
    transition: 'all 0.3s ease'
  })

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="modulo-header">
        <h1>Módulo 4: Reconstrucción de Sensores</h1>

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 'bold', color: '#d1d5db', fontSize: '1.1rem' }}>Seleccionar Escenario:</label>
          <select value={tipoSel} onChange={(e) => cambiarEscenario(e.target.value)} className="select-escenario-mod4">
            <option value="NORMAL">NORMAL (Datos Limpios)</option>
            <option value="ESTRES">ESTRÉS (Datos con Ruido)</option>
            <option value="MAL_CONDICIONADO">MAL CONDICIONADO (Fenómeno de Runge)</option>
          </select>
        </div>

        <div className="formulas-box">
          <strong>Modelo Matemático:</strong>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
            <MathComponent tex={String.raw`P(x) = \sum_{i=0}^{n} y_i L_i(x)`} />
            <MathComponent tex={String.raw`y_{ref}(t) = \sin(t) + 0.3\cos(2.5t)`} />
          </div>
        </div>
      </motion.div>

      <div className="layout-grid">
        <motion.div className="panel controls-panel glass-panel">
          <h2>Configuración de Nodos</h2>
          {error && <div className="alert-error">{error}</div>}

          <div className="form-group">
            <label>Número de Nodos:</label>
            <input type="number" name="n_nodos" value={params.n_nodos} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label>Nivel de Ruido:</label>
            <input type="number" name="ruido" value={params.ruido} onChange={handleInputChange} step="0.01" />
          </div>
          <div className="form-group">
            <label>Punto a Evaluar (x):</label>
            <input type="number" name="x_eval" value={params.x_eval} onChange={handleInputChange} step="0.1" />
          </div>

          <div className="button-group">
            <button onClick={() => calcular()} className="btn-primary">Reconstruir Señal</button>
            {resultado && (
              <button onClick={guardar} disabled={guardando} className="btn-secondary">
                {guardando ? 'Guardando...' : guardado ? '✅ Guardado' : 'Guardar en Historial'}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div className="panel results-panel glass-panel">
          {!resultado ? (
            <p className="empty-state">Ejecuta para ver los resultados.</p>
          ) : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <div style={tabStyle('grafica')} onClick={() => setActiveTab('grafica')}>1. Gráfica Comparativa</div>
                <div style={tabStyle('iteraciones')} onClick={() => setActiveTab('iteraciones')}>2. Tabla de Newton</div>
              </div>

              {activeTab === 'grafica' && (
                <div className="animate-fade-in">
                  <div className="chart-container">
                    <Line data={graficoData} options={{ maintainAspectRatio: false }} />
                  </div>
                  <div className="resultados-cards">
                    <div className="res-card">
                      <span>Error Lagrange</span>
                      <strong>{resultado.error_lagrange.toExponential(2)}</strong>
                    </div>
                    <div className="res-card">
                      <span>Error Newton</span>
                      <strong>{resultado.error_newton.toExponential(2)}</strong>
                    </div>
                    <div className="res-card">
                      <span>Error Spline</span>
                      <strong>{resultado.error_spline.toExponential(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'iteraciones' && (
                <div className="animate-fade-in">
                  <p style={{ color: '#d1d5db', fontSize: '0.9rem' }}>Tabla de Diferencias Divididas de Newton:</p>
                  <div className="table-wrapper" style={{ marginTop: '15px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Paso</th>
                          <th>Coeficientes Calculados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tablaNewton.map((iter, idx) => (
                          <tr key={idx}>
                            <td>Nivel {idx}</td>
                            <td style={{ fontSize: '0.8rem' }}>
                              {iter.map(val => val.toFixed(4)).join(' | ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="conclusion-box" style={{ flex: 1 }}>
                  <h3>Conclusión Numérica</h3>
                  <p>
                    Lagrange y Newton producen exactamente el mismo polinomio interpolador y, por tanto, el mismo error de predicción. Los Splines Cúbicos, al construir polinomios por tramos, evitan las oscilaciones violentas (Fenómeno de Runge) que ocurren en Lagrange/Newton cuando hay muchos nodos, siendo mucho más estables numéricamente.
                  </p>
                </div>
                <div className="conclusion-box" style={{ flex: 1, borderLeftColor: '#10b981' }}>
                  <h3>Conclusión del Problema</h3>
                  <p>
                    En el escenario de ESTRÉS (con ruido), los polinomios globales amplifican el error en los extremos. Para la reconstrucción confiable de señales en los sensores del teleférico, es mandatorio usar Splines Cúbicos o segmentación, ya que un solo dato ruidoso en Lagrange distorsiona toda la curva de lectura.
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}