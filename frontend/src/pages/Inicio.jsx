import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { motion } from 'framer-motion'
import './Inicio.css'

export default function Inicio() {
  const [casos, setCasos] = useState([])

  useEffect(() => {
    supabase.from('caso_estudio').select('*').order('id').then(({ data }) => setCasos(data || []))
  }, [])

  // Configuración de animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  }

  return (
    <div className="inicio-container">
      {/* Hero Section */}
      <motion.div 
        className="hero-section"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="hero-title">SIMTELE-RISK</h1>
        <p className="hero-subtitle">Sistema inteligente de simulación y gestión de riesgos</p>
        
        <div className="aviso-badge">
          ⚠️ Proyecto educativo con datos sintéticos · Sin conexión real
        </div>
      </motion.div>

      {/* Bento Grid */}
      <motion.div 
        className="bento-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {casos.map((c, index) => (
          <motion.div key={c.id} variants={itemVariants}>
            <Link to={`/modulo/${c.id}`} className="bento-card-link">
              <motion.div 
                className={`bento-card card-${index + 1}`}
                whileHover={{ scale: 1.02, rotate: index % 2 === 0 ? 1 : -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="card-glow"></div>
                <div className="card-content">
                  <div className="card-number">0{index + 1}</div>
                  <h3>{c.nombre}</h3>
                  <p>Modelo: {c.modelo_version}</p>
                  <div className="card-action">Explorar Módulo →</div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        className="historial-link-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <Link to="/historial" className="btn-historial">
          📁 Ver Historial de Simulaciones
        </Link>
      </motion.div>
    </div>
  )
}