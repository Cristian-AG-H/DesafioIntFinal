import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { motion, AnimatePresence } from 'framer-motion'
import ResultadoViewer from './ResultadoViewer.jsx'
import './Historial.css'

export default function Historial() {
  const [historial, setHistorial] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null) // Para el modal
  const [errorDb, setErrorDb] = useState(null)
  const navigate = useNavigate()

 useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const { data, error } = await supabase
          .from('simulacion')
          .select(`
            id, fecha, estado,
            escenario ( tipo, caso_id, caso_estudio ( nombre ) ),
            ejecucion_metodo ( 
              id,
              metodo, 
              resultado_resumen ( valor_json, referencia ) 
            )
          `)
          .order('fecha', { ascending: false })

        if (error) throw error
        
        // LOG DE DIAGNÓSTICO (Míralo en la consola del navegador)
        console.log("Datos crudos de Supabase:", data)
        
        setHistorial(data || [])
      } catch (err) {
        console.error("Error al cargar historial:", err)
        setErrorDb(err.message)
      } finally {
        setCargando(false)
      }
    }
    fetchHistorial()
  }, [])

  // Enviar el caso y el tipo de escenario en la URL
  // Dentro de Historial.jsx
  const relanzarSimulacion = (casoId, tipoEscenario, simId) => {
    navigate(`/modulo/${casoId}?escenario=${tipoEscenario}&simulacion=${simId}`)
  }

// Función segura para abrir el modal
  const verDetalles = (ejecucion) => {
    // 1. Verificamos si ejecucion existe
    if (!ejecucion) return alert("No hay datos de ejecución para esta simulación.")

    // 2. Verificamos si resultado_resumen existe y si es array u objeto
    let resumen = null;
    if (Array.isArray(ejecucion.resultado_resumen)) {
      resumen = ejecucion.resultado_resumen[0]?.valor_json
    } else if (ejecucion.resultado_resumen && typeof ejecucion.resultado_resumen === 'object') {
      // Por si Supabase lo devuelve como objeto único (relación 1:1)
      resumen = ejecucion.resultado_resumen.valor_json
    }

    if (resumen) {
      setSeleccionado(resumen)
    } else {
      console.warn("Objeto ejecución inspeccionado:", ejecucion)
      alert("Esta simulación no tiene resultados numéricos guardados. Revisa la consola para más detalles.")
    }
  }

  return (
    <div>
      <div className="container animate-fade-in">
        <h1 className="page-title">Historial de Experimentos</h1>

        {cargando ? (
          <p>Cargando registros de Supabase...</p>
        ) : errorDb ? (
          <div className="panel alert-error">
            <p>Error al conectar con la base de datos: {errorDb}</p>
          </div>
        ) : historial.length === 0 ? (
          <div className="panel"><p>No hay simulaciones guardadas aún.</p></div>
        ) : (
          <div className="panel glass-panel">
            <table className="tabla-historial">
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
                  // Tomamos la primera ejecución si existe
                  const ejec = sim.ejecucion_metodo?.[0] || {}

                  return (
                    <tr key={sim.id}>
                      <td>{new Date(sim.fecha).toLocaleString()}</td>
                      <td>{sim.escenario?.caso_estudio?.nombre || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${sim.escenario?.tipo?.toLowerCase() || 'normal'}`}>
                          {sim.escenario?.tipo || 'N/A'}
                        </span>
                      </td>
                      <td>{ejec.metodo || '-'}</td>
                      <td style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => verDetalles(ejec)}
                          className="btn-ver"
                        >
                          Ver Detalles
                        </button>
                        <button
                          onClick={() => relanzarSimulacion(sim.escenario?.caso_id, sim.escenario?.tipo, sim.id)}
                          className="btn-relanzar"
                        >
                          Relanzar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* MODAL PARA VER RESULTADOS JSON */}
        <AnimatePresence>
          {seleccionado && (
            <motion.div
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSeleccionado(null)}
            >
                                         <motion.div 
                className="modal-content" 
                initial={{ y: 50, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                exit={{ y: 50, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{ 
                  maxWidth: '700px', 
                  width: '90%', 
                  maxHeight: '85vh', // No ocupa más del 85% del alto de la pantalla
                  display: 'flex',
                  flexDirection: 'column' // Para que el header quede arriba y el body abajo
                }}
              >
                <h2 style={{ borderBottom: '1px solid #374151', paddingBottom: '10px', marginBottom: '15px', flexShrink: 0 }}>
                  Resultados Guardados
                </h2>
                
                {/* CONTENEDOR CON SCROLL */}
                <div style={{ 
                  overflowY: 'auto', // Aquí ocurre la magia
                  flex: 1,           // Toma el espacio restante
                  paddingRight: '10px' // Un poco de espacio para la barra de scroll
                }}>
                  <ResultadoViewer data={seleccionado} />
                </div>
                
                <div style={{ textAlign: 'right', marginTop: '20px', flexShrink: 0 }}>
                  <button onClick={() => setSeleccionado(null)} className="btn-cerrar">
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}