import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { rk4, rk2, romberg, trapecio, simpson13, biseccionDetallada, newtonRaphsonDetallado, secanteDetallada } from '../../math/metodos.js'
import { MathComponent } from 'mathjax-2025'
import { motion } from 'framer-motion'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import './Detencion.css'
import { supabase } from '../../lib/supabase.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

export default function Detencion() {
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [params, setParams] = useState({ v0: 10, a: 2.0, h: 0.1 })
  
  const [activeTab, setActiveTab] = useState('raices') // 'raices', 'edo', 'integracion'
  const [resultado, setResultado] = useState(null)
  
  // Datos para gráficos
  const [graficoEdo, setGraficoEdo] = useState(null)
  const [graficoIntegracion, setGraficoIntegracion] = useState(null)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('escenario').select('*').eq('caso_id', 1).order('tipo').then(({ data }) => {
      if (data) {
        setEscenarios(data)
        const normal = data.find(e => e.tipo === 'NORMAL')
        if (normal) setParams(normal.parametros_json)
      }
    })
  }, [])

  const cambiarEscenario = (tipo) => {
    setTipoSel(tipo)
    const esc = escenarios.find(e => e.tipo === tipo)
    if (esc) setParams(esc.parametros_json)
    setResultado(null)
    setGraficoEdo(null)
    setGraficoIntegracion(null)
    setGuardado(false)
  }

  const handleInputChange = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 })

  const calcular = () => {
    setError(null)
    setGuardado(false)
    try {
      const { v0, a, h } = params
      const t_det = v0 / a
      const dist_analitica = (v0 * v0) / (2 * a)

      // 1. RAÍCES (v(t) = v0 - a*t = 0)
      const f_raiz = (t) => v0 - a * t
      const df_raiz = () => -a
      const rBis = biseccionDetallada(f_raiz, 0, v0, 1e-5)
      const rNew = newtonRaphsonDetallado(f_raiz, df_raiz, 1.0, 1e-5)
      const rSec = secanteDetallada(f_raiz, 0.5, 2.0, 1e-5)

      // 2. EDO
      const f_edo = (t, v) => -a
      const resRK2 = rk2(f_edo, 0, v0, t_det, h)
      const resRK4 = rk4(f_edo, 0, v0, t_det, h)

      // 3. INTEGRACIÓN (distancia)
      const f_integral = (t) => v0 - a * t
      const dist_trap = trapecio(f_integral, 0, t_det, 100)
      const dist_simp = simpson13(f_integral, 0, t_det, 100)
      const resRomb = romberg(f_integral, 0, t_det, 5)

      setResultado({
        raices: { bis: rBis, new: rNew, sec: rSec },
        edo: { rk2: resRK2, rk4: resRK4 },
        integracion: { 
          trap: dist_trap, 
          simp: dist_simp, 
          romb: resRomb.valor, 
          historialRomb: resRomb.historial,
          analitica: dist_analitica 
        }
      })

      // Gráfico EDO
      setGraficoEdo({
        labels: resRK4.map(r => r.t.toFixed(2)),
        datasets: [
          { label: 'RK4', data: resRK4.map(r => r.y), borderColor: '#3b82f6', borderWidth: 3, tension: 0.1 },
          { label: 'RK2', data: resRK2.filter((_,i) => i%2===0).map(r => r.y), borderColor: '#f59e0b', borderDash: [5,5], tension: 0.1 },
          { label: 'Analítico', data: resRK4.map(r => v0 - a * r.t), borderColor: '#10b981', borderWidth: 1, borderDash: [2,2] }
        ]
      })

      // Gráfico Integración
      setGraficoIntegracion({
        labels: ['Trapecio', 'Simpson', 'Romberg'],
        datasets: [
          { label: 'Error Absoluto vs Analítico', data: [Math.abs(dist_analitica - dist_trap), Math.abs(dist_analitica - dist_simp), Math.abs(dist_analitica - resRomb.valor)], backgroundColor: ['#ef4444', '#f59e0b', '#10b981'] }
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
      const { data: ejec } = await supabase.from('ejecucion_metodo').insert([{ simulacion_id: sim.id, metodo: 'RK2, RK4, Trapecio, Simpson, Romberg' }]).select().single()
      await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejec.id, valor_json: resultado }])
      setGuardado(true)
    } catch (e) { alert(e.message) }
  }

  // Estilos para las pestañas
  const tabStyle = (tabName) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #3b82f6' : '3px solid transparent',
    color: activeTab === tabName ? '#fff' : '#9ca3af',
    fontWeight: activeTab === tabName ? 'bold' : 'normal',
    transition: 'all 0.3s ease'
  })

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="modulo-header">
        <h1>Módulo 1: Detención de Emergencia</h1>
        <div style={{ margin: '20px 0' }}>
          <select value={tipoSel} onChange={(e) => cambiarEscenario(e.target.value)} className="select-escenario">
            <option value="NORMAL">NORMAL (Frenado Regular)</option>
            <option value="ESTRES">ESTRÉS (Frenado Exigente)</option>
            <option value="MAL_CONDICIONADO">MAL CONDICIONADO (Paso Grande)</option>
          </select>
        </div>
        <div className="formulas-box">
          <strong>Modelo Matemático:</strong>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
             <MathComponent tex={String.raw`\frac{dv}{dt} = -a \Rightarrow v(t) = v_0 - at`} />
             <MathComponent tex={String.raw`d_{det} = \int_0^{t_{det}} v(t) dt = \frac{v_0^2}{2a}`} />
          </div>
        </div>
      </motion.div>

      <div className="layout-grid">
        <motion.div className="panel controls-panel glass-panel">
          <h2>Parámetros Editables</h2>
          {error && <div className="alert-error">{error}</div>}
          
          <div className="form-group"><label>Velocidad Inicial (v₀) [m/s]:</label><input type="number" name="v0" value={params.v0} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Desaceleración (a) [m/s²]:</label><input type="number" name="a" value={params.a} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Paso (h) [s]:</label><input type="number" name="h" value={params.h} onChange={handleInputChange} step="0.01" /></div>
          
          <div className="button-group">
            <button onClick={calcular} className="btn-primary">Calcular Todos</button>
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
              {/* SISTEMA DE PESTAÑAS */}
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <div style={tabStyle('raices')} onClick={() => setActiveTab('raices')}>1. Raíces (Tiempo)</div>
                <div style={tabStyle('edo')} onClick={() => setActiveTab('edo')}>2. EDO (Velocidad)</div>
                <div style={tabStyle('integracion')} onClick={() => setActiveTab('integracion')}>3. Integración (Distancia)</div>
              </div>

              {/* CONTENIDO: RAÍCES */}
              {activeTab === 'raices' && (
                <div className="animate-fade-in">
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Iteración</th><th>Bisección (t)</th><th>Newton (t)</th><th>Secante (t)</th></tr></thead>
                      <tbody>
                        {Array.from({ length: Math.max(resultado.raices.bis.historial.length, resultado.raices.new.historial.length, resultado.raices.sec.historial.length) }).map((_, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{resultado.raices.bis.historial[i]?.c.toFixed(4) || '-'}</td>
                            <td>{resultado.raices.new.historial[i]?.x.toFixed(4) || '-'}</td>
                            <td>{resultado.raices.sec.historial[i]?.x.toFixed(4) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTENIDO: EDO */}
              {activeTab === 'edo' && (
                <div className="animate-fade-in">
                  <div style={{ height: '300px', marginBottom: '20px' }}>
                    <Line data={graficoEdo} options={{ maintainAspectRatio: false }} />
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Tiempo (t)</th><th>RK4 (v)</th><th>RK2 (v)</th><th>Error Abs (RK4 vs Analítico)</th></tr></thead>
                      <tbody>
                        {resultado.edo.rk4.filter((_, i) => i % 2 === 0).map((r, i) => (
                          <tr key={i}>
                            <td>{r.t.toFixed(2)}</td>
                            <td>{r.y.toFixed(4)}</td>
                            <td>{resultado.edo.rk2[i*2]?.y.toFixed(4)}</td>
                            <td>{Math.abs(r.y - (params.v0 - params.a * r.t)).toExponential(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CONTENIDO: INTEGRACIÓN */}
              {activeTab === 'integracion' && (
                <div className="animate-fade-in">
                  <div style={{ height: '250px', marginBottom: '20px' }}>
                    <Bar data={graficoIntegracion} options={{ maintainAspectRatio: false }} />
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Método</th><th>Distancia</th><th>Error Absoluto</th></tr></thead>
                      <tbody>
                        <tr><td>Trapecio (n=100)</td><td>{resultado.integracion.trap.toFixed(4)}</td><td>{Math.abs(resultado.integracion.analitica - resultado.integracion.trap).toExponential(2)}</td></tr>
                        <tr><td>Simpson 1/3 (n=100)</td><td>{resultado.integracion.simp.toFixed(4)}</td><td>{Math.abs(resultado.integracion.analitica - resultado.integracion.simp).toExponential(2)}</td></tr>
                        <tr><td>Romberg (k=5)</td><td>{resultado.integracion.romb.toFixed(4)}</td><td>{Math.abs(resultado.integracion.analitica - resultado.integracion.romb).toExponential(2)}</td></tr>
                        <tr><td>Analítico</td><td>{resultado.integracion.analitica.toFixed(4)}</td><td>0</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOBLE CONCLUSIÓN */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="conclusion-box" style={{ flex: 1 }}>
                  <h3>Conclusión Numérica</h3>
                  <p>Los métodos de búsqueda de raíces (Bisección, Newton, Secante) coinciden en el tiempo de detención. Newton converge en menos iteraciones. En las EDOs, RK4 es superior a RK2. En integración, Romberg y Simpson demuestran un error despreciable frente a Trapecio, validando la precisión de la integración numérica.</p>
                </div>
                <div className="conclusion-box" style={{ flex: 1, borderLeftColor: '#60a5fa' }}>
                  <h3>Conclusión del Problema</h3>
                  <p>En un frenado de emergencia (escenario ESTRÉS), el tiempo de detención se alarga significativamente. Si la cabina no cuenta con el espacio físico (distancia de frenado) suficiente, impactará contra la estación. Es crítico mantener la tasa de desaceleración (a) constante y monitoreada.</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}