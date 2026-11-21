import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { 
  biseccionDetallada, newtonRaphsonDetallado, secanteDetallada,
  jacobi, gaussSeidel, gradienteConjugado, luDoolittle 
} from '../../math/metodos.js'
import { MathComponent } from 'mathjax-2025'
import { motion } from 'framer-motion'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import './Deterioro.css'
import { supabase } from '../../lib/supabase.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Deterioro() {
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [params, setParams] = useState({ D0: 0, alpha: 0.5, beta: 0.02, umbral: 5.0 })
  
  const [activeTab, setActiveTab] = useState('raices') // 'raices', 'sistemas'
  const [resultadoRaices, setResultadoRaices] = useState(null)
  const [resultadoSistemas, setResultadoSistemas] = useState(null)
  const [graficoConvergencia, setGraficoConvergencia] = useState(null)
  
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  // Matriz SPD Fija para el sistema lineal de calibración (Semana 1)
  const A_sys = [
    [10, 2, 1, 0],
    [2, 12, -2, 1],
    [1, -2, 15, 3],
    [0, 1, 3, 14]
  ]
  const b_sys = [13, 31, -9, 41] // Resultado exacto esperado: [1, 2, -1, 3]

  useEffect(() => {
    supabase.from('escenario').select('*').eq('caso_id', 2).order('tipo').then(({ data }) => {
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
    setResultadoRaices(null)
    setResultadoSistemas(null)
    setGraficoConvergencia(null)
    setGuardado(false)
  }

  const handleInputChange = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 })

  const calcular = () => {
    setError(null)
    setGuardado(false)
    try {
      // 1. CÁLCULO DE RAÍCES: f(t) = D0 + alpha*t + beta*t^2 - umbral
      const f = (t) => params.D0 + params.alpha * t + params.beta * t * t - params.umbral
      const df = (t) => params.alpha + 2 * params.beta * t

      const rBis = biseccionDetallada(f, 0, 100, 1e-5)
      const rNew = newtonRaphsonDetallado(f, df, 10, 1e-5)
      const rSec = secanteDetallada(f, 5, 15, 1e-5)

      setResultadoRaices({
        bis: rBis, new: rNew, sec: rSec
      })

      // Gráfico de convergencia de error
      setGraficoConvergencia({
        labels: Array.from({ length: Math.max(rBis.historial.length, rNew.historial.length) }).map((_, i) => `Iter ${i+1}`),
        datasets: [
          { 
            label: 'Error Bisección', 
            data: rBis.historial.map(h => h.error), 
            borderColor: '#ef4444', 
            borderWidth: 2, 
            tension: 0.1 
          },
          { 
            label: 'Error Newton-Raphson', 
            data: rNew.historial.map(h => h.error), 
            borderColor: '#10b981', 
            borderWidth: 2, 
            tension: 0.1 
          }
        ]
      })

      // 2. CÁLCULO DE SISTEMAS LINEALES (A_sys * x = b_sys)
      const x0 = [0, 0, 0, 0] // Semilla inicial
      const sJacobi = jacobi(A_sys, b_sys, x0, 1e-5, 100)
      const sGS = gaussSeidel(A_sys, b_sys, x0, 1e-5, 100)
      const sCG = gradienteConjugado(A_sys, b_sys, x0, 1e-5, 100)
      const sLU = luDoolittle(A_sys, b_sys)

      setResultadoSistemas({
        jacobi: sJacobi, gs: sGS, cg: sCG, lu: sLU
      })

    } catch (err) {
      setError(err.message)
    }
  }

  const guardar = async () => {
    try {
      const escActual = escenarios.find(e => e.tipo === tipoSel)
      const { data: sim } = await supabase.from('simulacion').insert([{ escenario_id: escActual.id }]).select().single()
      const { data: ejec } = await supabase.from('ejecucion_metodo').insert([{ simulacion_id: sim.id, metodo: 'Bisección, Newton, Secante, Jacobi, GS, CG, LU' }]).select().single()
      await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejec.id, valor_json: { raices: resultadoRaices, sistemas: resultadoSistemas } }])
      setGuardado(true)
    } catch (e) { alert(e.message) }
  }

  const tabStyle = (tabName) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #f59e0b' : '3px solid transparent',
    color: activeTab === tabName ? '#fff' : '#9ca3af',
    fontWeight: activeTab === tabName ? 'bold' : 'normal',
    transition: 'all 0.3s ease'
  })

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="modulo-header">
        <h1>Módulo 2: Deterioro Mecánico</h1>
        
        <div style={{ margin: '20px 0' }}>
          <select value={tipoSel} onChange={(e) => cambiarEscenario(e.target.value)} className="select-escenario-mod2">
            <option value="NORMAL">NORMAL (Desgaste Progresivo)</option>
            <option value="ESTRES">ESTRÉS (Desgaste Acelerado)</option>
            <option value="MAL_CONDICIONADO">MAL CONDICIONADO (Inestabilidad)</option>
          </select>
        </div>

        <div className="formulas-box">
          <strong>Modelo Matemático:</strong>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
             <MathComponent tex={String.raw`D(t) = D_0 + \alpha t + \beta t^2`} />
             <MathComponent tex={String.raw`f(t) = D(t) - D_{umbral} = 0`} />
          </div>
        </div>
      </motion.div>

      <div className="layout-grid">
        <motion.div className="panel controls-panel glass-panel">
          <h2>Parámetros del Modelo</h2>
          {error && <div className="alert-error">{error}</div>}
          
          <div className="form-group"><label>Desgaste Inicial (D₀):</label><input type="number" name="D0" value={params.D0} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Coef. Lineal (α):</label><input type="number" name="alpha" value={params.alpha} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Coef. Cuadrático (β):</label><input type="number" name="beta" value={params.beta} onChange={handleInputChange} step="0.01" /></div>
          <div className="form-group"><label>Umbral Crítico (D_umbral):</label><input type="number" name="umbral" value={params.umbral} onChange={handleInputChange} /></div>
          
          <div className="button-group">
            <button onClick={calcular} className="btn-primary">Calcular Modelos</button>
            {resultadoRaices && (
              <button onClick={guardar} className="btn-secondary">
                {guardado ? '✅ Guardado' : 'Guardar en Historial'}
              </button>
            )}
          </div>
        </motion.div>

        <motion.div className="panel results-panel glass-panel">
          {!resultadoRaices ? <p className="empty-state">Ejecuta para ver los resultados.</p> : (
            <>
              <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                <div style={tabStyle('raices')} onClick={() => setActiveTab('raices')}>1. Raíces (Tiempo Límite)</div>
                <div style={tabStyle('sistemas')} onClick={() => setActiveTab('sistemas')}>2. Sistemas Lineales (SPD)</div>
              </div>

              {/* CONTENIDO: RAÍCES */}
              {activeTab === 'raices' && (
                <div className="animate-fade-in">
                  <div className="chart-container">
                    <Line data={graficoConvergencia} options={{ maintainAspectRatio: false }} />
                  </div>
                  
                  <h3>Tabla Comparativa de Raíces</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Iteración</th><th>Bisección (Años)</th><th>Newton (Años)</th><th>Secante (Años)</th></tr></thead>
                      <tbody>
                        {Array.from({ length: Math.max(resultadoRaices.bis.historial.length, resultadoRaices.new.historial.length, resultadoRaices.sec.historial.length) }).map((_, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td>{resultadoRaices.bis.historial[i]?.c.toFixed(4) || '-'}</td>
                            <td>{resultadoRaices.new.historial[i]?.x.toFixed(4) || '-'}</td>
                            <td>{resultadoRaices.sec.historial[i]?.x.toFixed(4) || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="resultados-cards" style={{ marginTop: '20px' }}>
                    <div className="res-card"><span>Raíz Bisección</span><strong>{resultadoRaices.bis.raiz.toFixed(4)} años</strong></div>
                    <div className="res-card"><span>Raíz Newton</span><strong>{resultadoRaices.new.raiz.toFixed(4)} años</strong></div>
                    <div className="res-card"><span>Raíz Secante</span><strong>{resultadoRaices.sec.raiz.toFixed(4)} años</strong></div>
                  </div>
                </div>
              )}

              {/* CONTENIDO: SISTEMAS */}
              {activeTab === 'sistemas' && (
                <div className="animate-fade-in">
                  <div style={{ color: '#d1d5db', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span>Resolviendo la matriz SPD de calibración</span>
                    <MathComponent tex={String.raw`A_{4 \times 4}`} />
                    <span>. Solución exacta esperada:</span>
                    <MathComponent tex={String.raw`[1, 2, -1, 3]^T`} />
                  </div>
                  <div className="table-wrapper" style={{ marginTop: '15px' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Método</th>
                          <th>x₁</th><th>x₂</th><th>x₃</th><th>x₄</th>
                          <th>Iteraciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>LU (Directo)</td>
                          <td>{resultadoSistemas.lu.x[0].toFixed(4)}</td><td>{resultadoSistemas.lu.x[1].toFixed(4)}</td><td>{resultadoSistemas.lu.x[2].toFixed(4)}</td><td>{resultadoSistemas.lu.x[3].toFixed(4)}</td>
                          <td>1 (Directo)</td>
                        </tr>
                        <tr>
                          <td>Gradiente Conjugado</td>
                          <td>{resultadoSistemas.cg.x[0].toFixed(4)}</td><td>{resultadoSistemas.cg.x[1].toFixed(4)}</td><td>{resultadoSistemas.cg.x[2].toFixed(4)}</td><td>{resultadoSistemas.cg.x[3].toFixed(4)}</td>
                          <td>{resultadoSistemas.cg.historial.length}</td>
                        </tr>
                        <tr>
                          <td>Gauss-Seidel</td>
                          <td>{resultadoSistemas.gs.x[0].toFixed(4)}</td><td>{resultadoSistemas.gs.x[1].toFixed(4)}</td><td>{resultadoSistemas.gs.x[2].toFixed(4)}</td><td>{resultadoSistemas.gs.x[3].toFixed(4)}</td>
                          <td>{resultadoSistemas.gs.historial.length}</td>
                        </tr>
                        <tr>
                          <td>Jacobi</td>
                          <td>{resultadoSistemas.jacobi.x[0].toFixed(4)}</td><td>{resultadoSistemas.jacobi.x[1].toFixed(4)}</td><td>{resultadoSistemas.jacobi.x[2].toFixed(4)}</td><td>{resultadoSistemas.jacobi.x[3].toFixed(4)}</td>
                          <td>{resultadoSistemas.jacobi.historial.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DOBLE CONCLUSIÓN */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="conclusion-box" style={{ flex: 1 }}>
                  <h3>Conclusión Numérica</h3>
                  <p>En las raíces, Newton-Raphson converge de forma cuadrática (en menos iteraciones) gracias a la derivada, mientras que Bisección es más lento pero siempre converge. En los sistemas lineales, el Gradiente Conjugado es ideal para matrices SPD simétricas, resolviendo en menos iteraciones que Jacobi y Gauss-Seidel, que dependen fuertemente de la dominancia diagonal.</p>
                </div>
                <div className="conclusion-box" style={{ flex: 1, borderLeftColor: '#f59e0b' }}>
                  <h3>Conclusión del Problema</h3>
                  <p>El tiempo límite hasta el umbral de mantenimiento depende cuadráticamente del coeficiente β. En el escenario ESTRÉS, la tasa α crece, adelantando la fecha de inspección. Un mantenimiento retrasado aumentará el deterioro más allá del umbral, provocando fallas estructurales en los cables del teleférico.</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}