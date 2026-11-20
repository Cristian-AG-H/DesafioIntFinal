import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import Modulo from './pages/Modulo.jsx'
import Historial from './pages/Historial.jsx' // NUEVO

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/modulo/:casoId" element={<Modulo />} />
      <Route path="/historial" element={<Historial />} /> {/* NUEVA RUTA */}
    </Routes>
  )
}