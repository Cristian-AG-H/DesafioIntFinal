import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import Historial from './pages/Historial.jsx'
import Detencion from './pages/Modulo1/Detencion.jsx'
import Deterioro from './pages/Modulo2/Deterioro.jsx'
import Oscilaciones from './pages/Modulo3/Oscilaciones.jsx'
import Sensores from './pages/Modulo4/Sensores.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/modulo/1" element={<Detencion />} />
      <Route path="/modulo/2" element={<Deterioro />} />
      <Route path="/modulo/3" element={<Oscilaciones />} />
      <Route path="/modulo/4" element={<Sensores />} />
      <Route path="/historial" element={<Historial />} />
    </Routes>
  )
}