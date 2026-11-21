import { useState, useEffect } from 'react'
import Layout from '../../components/Layout.jsx'
import { rk4Sistema, trapecio, simpson13, romberg } from '../../math/metodos.js'
import { MathComponent } from 'mathjax-2025'
import { motion } from 'framer-motion'
import { Line, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import './Oscilaciones.css'
import { supabase } from '../../lib/supabase.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

export default function Oscilaciones() {
  const [escenarios, setEscenarios] = useState([])
  const [tipoSel, setTipoSel] = useState('NORMAL')
  const [params, setParams] = useState({ m: 1.0, c: 0.2, k: 4.0, F0: 0.0, T: 20, h: 0.1 })
  
  const [activeTab, setActiveTab] = useState('edo') // 'edo', 'integracion'
  const [resultado, setResultado] = useState(null)
  const [graficoEdo, setGraficoEdo] = useState(null)
  const [graficoIntegracion, setGraficoIntegracion] = useState(null)
  
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.from('escenario').select('*').eq('caso_id', 3).order('tipo').then(({ data }) => {
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
      const { m, c, k, F0, T, h } = params

      // 1. EDO Sistema: x' = v, v' = (-c*v - k*x + F)/m
      const f_sistema = (t, y) => {
        const [x, v] = y
        const F = F0 * Math.sin(t) // Fuerza externa armónica
        return [v, (-c * v - k * x + F) / m]
      }

      // RK4 (importado)
      const resRK4 = rk4Sistema(f_sistema, 0, [1.0, 0.0], T, h)

      // RK2 (Heun para sistemas, implementado localmente)
      let t = 0, y = [1.0, 0.0]
      const resRK2 = [{ t, x: y[0], v: y[1] }]
      while (t < T) {
        const k1 = f_sistema(t, y)
        const k2 = f_sistema(t + h, [y[0] + h * k1[0], y[1] + h * k1[1]])
        const x_new = y[0] + (h / 2) * (k1[0] + k2[0])
        const v_new = y[1] + (h / 2) * (k1[1] + k2[1])
        y = [x_new, v_new]
        t += h
        resRK2.push({ t, x: y[0], v: y[1] })
      }

      // 2. Integración de x(t)^2
      const f_integral = (t) => {
        // Interpolamos el valor de x(t) usando el resultado de RK4
        const index = Math.min(Math.floor(t / h), resRK4.length - 1)
        return Math.pow(resRK4[index].x, 2)
      }

      const int_trap = trapecio(f_integral, 0, T, 200)
      const int_simp = simpson13(f_integral, 0, T, 200)
      const res_romb = romberg(f_integral, 0, T, 5)

      setResultado({
        edo: { rk4: resRK4, rk2: resRK2 },
        integracion: { trap: int_trap, simp: int_simp, romb: res_romb.valor }
      })

      // Gráfico 1: Trayectoria x(t)
      setGraficoEdo({
        labels: resRK4.filter((_, i) => i % 10 === 0).map(r => r.t.toFixed(1)),
        datasets: [
          { label: 'RK4', data: resRK4.filter((_, i) => i % 10 === 0).map(r => r.x), borderColor: '#8b5cf6', borderWidth: 3, tension: 0.1 },
          { label: 'RK2', data: resRK2.filter((_, i) => i % 10 === 0).map(r => r.x), borderColor: '#f43f5e', borderDash: [5,5], tension: 0.1 }
        ]
      })

      // Gráfico 2: Magnitud integrada (x^2)
      setGraficoIntegracion({
        labels: ['Trapecio', 'Simpson', 'Romberg'],
        datasets: [
          { label: 'Energía Acumulada ∫x(t)² dt', data: [int_trap, int_simp, res_romb.valor], backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'] }
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

  const tabStyle = (tabName) => ({
    padding: '10px 20px', cursor: 'pointer',
    borderBottom: activeTab === tabName ? '3px solid #8b5cf6' : '3px solid transparent',
    color: activeTab === tabName ? '#fff' : '#9ca3af',
    fontWeight: activeTab === tabName ? 'bold' : 'normal', transition: 'all 0.3s ease'
  })

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="modulo-header">
        <h1>Módulo 3: Oscilaciones por Viento</h1>
        
        <div style={{ margin: '20px 0' }}>
          <select value={tipoSel} onChange={(e) => cambiarEscenario(e.target.value)} className="select-escenario-mod3">
            <option value="NORMAL">NORMAL (Vibración Libre)</option>
            <option value="ESTRES">ESTRÉS (Fuerza de Viento Alta)</option>
            <option value="MAL_CONDICIONADO">MAL CONDICIONADO (Amortiguamiento Cero)</option>
          </select>
        </div>

        <div className="formulas-box">
          <strong>Modelo Matemático:</strong>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
             <MathComponent tex={String.raw`m\frac{d^2x}{dt^2} + c\frac{dx}{dt} + kx = F(t)`} />
             <MathComponent tex={String.raw`E = \int_0^T x(t)^2 dt`} />
          </div>
        </div>
      </motion.div>

      <div className="layout-grid">
        <motion.div className="panel controls-panel glass-panel">
          <h2>Parámetros Físicos</h2>
          {error && <div className="alert-error">{error}</div>}
          
          <div className="form-group"><label>Masa (m) [kg]:</label><input type="number" name="m" value={params.m} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Amortiguamiento (c):</label><input type="number" name="c" value={params.c} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Rigidez (k):</label><input type="number" name="k" value={params.k} onChange={handleInputChange} step="0.5" /></div>
          <div className="form-group"><label>Fuerza Viento (F₀):</label><input type="number" name="F0" value={params.F0} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Tiempo Total (T) [s]:</label><input type="number" name="T" value={params.T} onChange={handleInputChange} /></div>
          <div className="form-group"><label>Paso (h) [s]:</label><input type="number" name="h" value={params.h} onChange={handleInputChange} step="0.01" /></div>
          
          <div className="button-group">
            <button onClick={calcular} className="btn-primary">Simular Oscilación</button>
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
                <div style={tabStyle('edo')} onClick={() => setActiveTab('edo')}>1. EDO (Trayectoria)</div>
                <div style={tabStyle('integracion')} onClick={() => setActiveTab('integracion')}>2. Integración (Energía)</div>
              </div>

              {activeTab === 'edo' && (
                <div className="animate-fade-in">
                  <div className="chart-container">
                    <Line data={graficoEdo} options={{ maintainAspectRatio: false }} />
                  </div>
                  <h3>Tabla de Trayectoria (RK4)</h3>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Tiempo (s)</th><th>Posición x(t) [m]</th><th>Velocidad v(t) [m/s]</th></tr></thead>
                      <tbody>
                        {resultado.edo.rk4.filter((_, i) => i % 20 === 0).map((r, i) => (
                          <tr key={i}><td>{r.t.toFixed(2)}</td><td>{r.x.toFixed(4)}</td><td>{r.v.toFixed(4)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'integracion' && (
                <div className="animate-fade-in">
                  <div style={{ height: '250px', marginBottom: '20px' }}>
                    <Bar data={graficoIntegracion} options={{ maintainAspectRatio: false }} />
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>Método</th><th>Magnitud Acumulada (Energía)</th></tr></thead>
                      <tbody>
                        <tr><td>Trapecio (n=200)</td><td>{resultado.integracion.trap.toFixed(4)}</td></tr>
                        <tr><td>Simpson 1/3 (n=200)</td><td>{resultado.integracion.simp.toFixed(4)}</td></tr>
                        <tr><td>Romberg (k=5)</td><td>{resultado.integracion.romb.toFixed(4)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div className="conclusion-box" style={{ flex: 1 }}>
                  <h3>Conclusión Numérica</h3>
                  <p>RK4 es sustancialmente más preciso que RK2 para capturar las oscilaciones armónicas, manteniendo la amplitud constante sin disipación artificial. En la integración de la energía (x²), Romberg y Simpson convergen casi al mismo valor, demostrando una alta precisión, mientras que Trapecio tiende a subestimar ligeramente el área.</p>
                </div>
                <div className="conclusion-box" style={{ flex: 1, borderLeftColor: '#8b5cf6' }}>
                  <h3>Conclusión del Problema</h3>
                  <p>La amplitud máxima depende inversamente del amortiguamiento (c). En el escenario MAL_CONDICIONADO (c≈0), la cabina oscila indefinidamente, lo cual es fatal para la seguridad estructural. En el escenario ESTRÉS (viento fuerte), la frecuencia de resonancia del sistema debe estar alejada de la frecuencia de las ráfagas para evitar colapso.</p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </Layout>
  )
}






















/*import { useState } from 'react'
import Layout from '../../components/Layout.jsx'
import { rk4Sistema } from '../../math/metodos.js'
import { Line } from 'react-chartjs-2'
import { MathComponent } from 'mathjax-2025'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import './Oscilaciones.css'
import { supabase } from '../../lib/supabase.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Oscilaciones() {
  const [params, setParams] = useState({ m: 1.0, c: 0.2, k: 4.0, F0: 0.0, T: 20, h: 0.1 })
  const [resultado, setResultado] = useState(null)
  const [graficoData, setGraficoData] = useState(null)
  const [tabla, setTabla] = useState([])

  const handleInputChange = (e) => setParams({ ...params, [e.target.name]: parseFloat(e.target.value) || 0 })

  const calcular = () => {
    try {
      // EDO Sistema: x' = v, v' = (-c*v - k*x + F)/m
      const f_sistema = (t, y) => {
        const [x, v] = y
        const F = params.F0 * Math.sin(t) // Fuerza externa armónica
        return [v, (-params.c * v - params.k * x + F) / params.m]
      }

      const resRK = rk4Sistema(f_sistema, 0, [1.0, 0.0], params.T, params.h) // x0=1, v0=0

      // Encontrar amplitud máxima
      const maxAmp = Math.max(...resRK.map(r => Math.abs(r.x)))

      setResultado({ maxAmplitud: maxAmp, iteraciones: resRK.length })
      setTabla(resRK.filter((_, i) => i % 10 === 0).slice(0, 15)) // Muestra cada 10 pasos para no saturar

      setGraficoData({
        labels: resRK.map(r => r.t.toFixed(1)),
        datasets: [
          { label: 'Posición x(t) [m]', data: resRK.map(r => r.x), borderColor: '#8b5cf6', tension: 0.1 },
          { label: 'Velocidad v(t) [m/s]', data: resRK.map(r => r.v), borderColor: '#f43f5e', borderDash: [5, 5], tension: 0.1 }
        ]
      })
    } catch (err) { alert(err.message) }
  }

  const guardar = async () => {
    try {
      const { data: sim } = await supabase.from('simulacion').insert([{ escenario_id: 3 }]).select().single()
      const { data: ejec } = await supabase.from('ejecucion_metodo').insert([{ simulacion_id: sim.id, metodo: 'RK4 Sistema' }]).select().single()
      await supabase.from('resultado_resumen').insert([{ ejecucion_id: ejec.id, valor_json: resultado }])
      alert('Guardado')
    } catch (e) { alert(e.message) }
  }

  return (
    <Layout>
      <div className="modulo-header">
        <h1>Módulo 3: Oscilaciones por Viento</h1>
        <p className="contexto">
          <strong>Contexto:</strong> Las ráfagas de viento transversal inducen un movimiento oscilatorio en las cabinas. Se modela como un sistema masa-resorte-amortiguador para determinar la amplitud máxima y garantizar que no choque con las torres.
        </p>
        <div className="formulas-box">
          <strong>Ecuación Diferencial:</strong>
          <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <MathComponent tex={String.raw`m\frac{d^2x}{dt^2} + c\frac{dx}{dt} + kx = F(t)`} />
            <MathComponent tex={String.raw`\text{Convertida a sistema de EDOs de primer orden}`} />
          </div>
        </div>
      </div>

      <div className="layout-grid">
        <div className="panel controls-panel">
          <h2>Parámetros Físicos</h2>
          <div className="form-group"><label>Masa (m) [kg]:</label><input type="number" name="m" value={params.m} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Amortiguamiento (c):</label><input type="number" name="c" value={params.c} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Rigidez (k):</label><input type="number" name="k" value={params.k} onChange={handleInputChange} step="0.5" /></div>
          <div className="form-group"><label>Fuerza Viento (F₀):</label><input type="number" name="F0" value={params.F0} onChange={handleInputChange} step="0.1" /></div>
          <div className="form-group"><label>Paso de tiempo (h):</label><input type="number" name="h" value={params.h} onChange={handleInputChange} step="0.01" /></div>
          
          <div className="button-group">
            <button onClick={calcular} className="btn-primary">Simular Oscilación</button>
            {resultado && <button onClick={guardar} className="btn-secondary">Guardar en Historial</button>}
          </div>
        </div>

        <div className="panel results-panel">
          <h2>Análisis Dinámico</h2>
          {!resultado ? <p className="empty-state">Ajusta los parámetros y ejecuta.</p> : (
            <>
              <div className="resultados-cards">
                <div className="res-card"><span>Amplitud Máxima</span><strong>{resultado.maxAmplitud.toFixed(3)} m</strong></div>
                <div className="res-card"><span>Pasos Totales</span><strong>{resultado.iteraciones}</strong></div>
              </div>

              <div className="grafico-container"><Line data={graficoData} options={{ maintainAspectRatio: false }} /></div>

              <h3>Muestra Temporal (RK4)</h3>
              <table className="tabla-iteraciones">
                <thead><tr><th>Tiempo (s)</th><th>Posición x (m)</th><th>Velocidad v (m/s)</th></tr></thead>
                <tbody>
                  {tabla.map((fila, i) => (
                    <tr key={i}><td>{fila.t.toFixed(2)}</td><td>{fila.x.toFixed(4)}</td><td>{fila.v.toFixed(4)}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="conclusion-box">
                <h3>Conclusión Teórica</h3>
                <p>El amortiguamiento (c) juega el papel más importante: si es muy bajo, la amplitud máxima es alta y el sistema tardará mucho en estabilizarse (subamortiguado). El método RK4 de 4to orden es excepcionalmente preciso para este tipo de sistemas dinámicos, capturando perfectamente las ondas sinusoidales incluso con pasos de integración relativamente grandes.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}*/