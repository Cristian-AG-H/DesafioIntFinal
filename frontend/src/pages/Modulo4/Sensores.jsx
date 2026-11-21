import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { lagrange, newtonInterpolacion, splineCubico } from '../../math/metodos.js'
import { MathComponent } from 'mathjax-2025'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import './Sensores.css'
import { supabase } from '../../lib/supabase.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Sensores() {
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [params, setParams] = useState({ n_nodos: 8, ruido: 0.0, x_eval: 1.5 })
  
  const [activeTab, setActiveTab] = useState('grafica') // 'grafica', 'iteraciones'
  const [resultado, setResultado] = useState(null)
  const [graficoData, setGraficoData] = useState(null)
  const [tablaNewton, setTablaNewton] = useState([])
  
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('escenario').select('*').eq('caso_id', 4).order('tipo').then(({ data }) => {
      if (data) {
        setEscenarios(data)
        const normal = data.find(e => e.tipo === 'NORMAL')
        if (normal) setParams({ x_eval: 1.5, ...normal.parametros_json })
      }
    })
  }, [])

  const cambiarEscenario = (tipo) => {
    setTipoSel(tipo)
    const esc = escenarios.find(e => e.tipo === tipo)
    if (esc) setParams({ x_eval: 1.5, ...esc.parametros_json })
    setResultado(null)
    setGraficoData(null)
    setGuardado(false)
  }

  const handleInputChange = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 })

  const calcular = () => {
    setError(null)
    setGuardado(false)
    try {
      const { n_nodos, ruido, x_eval } = params
      
      // 1. Generar nodos
      const nodos = []
      for (let i = 0; i < n_nodos; i++) {
        const t = (i * 2 * Math.PI) / (n_nodos - 1)
        let y = Math.sin(t) + 0.3 * Math.cos(2.5 * t)
        if (ruido > 0) y += (Math.random() - 0.5) * ruido
        nodos.push({ t, y })
      }

      // 2. Evaluar métodos en el punto solicitado
      const y_real = Math.sin(x_eval) + 0.3 * Math.cos(2.5 * x_eval)
      const y_lagrange = lagrange(nodos, x_eval)
      const res_newton = newtonInterpolacion(nodos, x_eval)
      const y_spline = splineCubico(nodos, x_eval)

      setResultado({
        real: y_real, lagrange: y_lagrange, newton: res_newton.valor, spline: y_spline,
        error_lagrange: Math.abs(y_real - y_lagrange),
        error_newton: Math.abs(y_real - res_newton.valor),
        error_spline: Math.abs(y_real - y_spline)
      })
      setTablaNewton(res_newton.iteraciones)

      // 3. Gráfico de curvas
      const xs = Array.from({ length: 100 }, (_, i) => (i * 2 * Math.PI) / 99)
      setGraficoData({
        labels: xs.map(x => x.toFixed(2)),
        datasets: [
          { label: 'Señal Real', data: xs.map(x => Math.sin(x) + 0.3 * Math.cos(2.5 * x)), borderColor: '#3b82f6', borderWidth: 3, tension: 0.1 },
          { label: 'Lagrange', data: xs.map(x => lagrange(nodos, x)), borderColor: '#ef4444', borderDash: [5,5], tension: 0.1 },
          { label: 'Spline Cúbico', data: xs.map(x => splineCubico(nodos, x)), borderColor: '#10b981', borderWidth: 2, tension: 0.1 }
        ]
      })

    } catch (err) {
      setError(err.message)
    }
  }

  const guardar = async () => {
    try {
      const escActual = escenarios.find(e => e.tipo === tipoSel)
      const { data: sim } = await supabase.from('simulacion').insert([{ escenario_id: escActual.id }]).select().single()
      const { data: ejec } = await supabase.from('ejecucion_metodo').insert([{ simulacion_id: sim.id, metodo: 'Lagrange, Newton, Splines' }]).select().single()
      await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejec.id, valor_json: resultado }])
      setGuardado(true)
    } catch (e) { alert(e.message) }
  }

  const tabStyle = (tabName) => ({
    padding: '10px 20px', cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #10b981' : '3px solid transparent',
    color: activeTab === tabName ? '#fff' : '#9ca3af',
    fontWeight: activeTab === tabName ? 'bold' : 'normal', transition: 'all 0.3s ease'
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
          
          <div className="form-group"><label>Número de Nodos:</label><input type="number" name="n_nodos" value={params.n_nodos} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Nivel de Ruido:</label><input type="number" name="ruido" value={params.ruido} onChange={handleInputChange} step="0.01" /></div>
          <div className="form-group"><label>Punto a Evaluar (x):</label><input type="number" name="x_eval" value={params.x_eval} onChange={handleInputChange} step="0.1" /></div>
          
          <div className="button-group">
            <button onClick={calcular} className="btn-primary">Reconstruir Señal</button>
            {resultado && (
              <button onClick={guardar} className="btn-secondary">
                {guardado ? '✅ Guardado' : 'Guardar en Historial'}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div className="panel results-panel glass-panel">
          {!resultado ? <p className="empty-state">Ejecuta para ver los resultados.</p> : (
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
                    <div className="res-card"><span>Error Lagrange</span><strong>{resultado.error_lagrange.toExponential(2)}</strong></div>
                    <div className="res-card"><span>Error Newton</span><strong>{resultado.error_newton.toExponential(2)}</strong></div>
                    <div className="res-card"><span>Error Spline</span><strong>{resultado.error_spline.toExponential(2)}</strong></div>
                  </div>
                </div>
              )}

              {activeTab === 'iteraciones' && (
                <div className="animate-fade-in">
                  <p style={{ color: '#d1d5db', fontSize: '0.9rem' }}>Tabla de Diferencias Divididas de Newton:</p>
                  <div className="table-wrapper" style={{ marginTop: '15px' }}>
                    <table>
                      <thead><tr><th>Paso</th><th>Coeficientes Calculados</th></tr></thead>
                      <tbody>
                        {tablaNewton.map((iter, idx) => (
                          <tr key={idx}>
                            <td>Nivel {idx}</td>
                            <td style={{ fontSize: '0.8rem' }}>{iter.map(val => val.toFixed(4)).join(" | ")}</td>
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
                  <p>Lagrange y Newton producen exactamente el mismo polinomio interpolador y, por tanto, el mismo error de predicción. Los Splines Cúbicos, al construir polinomios por tramos, evitan las oscilaciones violentas (Fenómeno de Runge) que ocurren en Lagrange/Newton cuando hay muchos nodos, siendo mucho más estables numéricamente.</p>
                </div>
                <div className="conclusion-box" style={{ flex: 1, borderLeftColor: '#10b981' }}>
                  <h3>Conclusión del Problema</h3>
                  <p>En el escenario de ESTRÉS (con ruido), los polinomios globales amplifican el error en los extremos. Para la reconstrucción confiable de señales en los sensores del teleférico, es mandatorio usar Splines Cúbicos o segmentación, ya que un solo dato ruidoso en Lagrange distorsiona toda la curva de lectura.</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}