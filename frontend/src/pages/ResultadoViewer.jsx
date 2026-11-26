import React from 'react'

export default function ResultadoViewer({ data }) {
  if (!data) return <p>No hay datos disponibles.</p>

  // Función auxiliar para renderizar objetos genéricos recursivamente si no hay un diseño específico
  const renderGeneric = (obj, nivel = 0) => {
    if (obj === null || obj === undefined) return <span style={{color: '#9ca3af'}}>null</span>
    if (typeof obj !== 'object') return <span style={{color: '#60a5fa'}}>{String(obj)}</span>

    return (
      <div style={{ paddingLeft: nivel > 0 ? '15px' : '0', borderLeft: nivel > 0 ? '2px solid #374151' : 'none', marginBottom: '10px' }}>
        {Object.entries(obj).map(([key, value]) => (
          <div key={key} style={{ marginBottom: '5px' }}>
            <strong style={{ color: '#f3f4f6' }}>{key.replace(/_/g, ' ').toUpperCase()}: </strong>
            {typeof value === 'object' ? renderGeneric(value, nivel + 1) : (
              <span style={{ color: typeof value === 'number' ? '#10b981' : '#60a5fa' }}>
                {typeof value === 'number' ? value.toFixed(4) : String(value)}
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ==========================================
  // DISEÑOS ESPECÍFICOS POR MÓDULO
  // ==========================================

  // MÓDULO 1: Detención
  if (data.raices && data.edo && data.integracion) {
    return (
      <div className="animate-fade-in">
        <h4 style={{ color: '#3b82f6', marginBottom: '10px' }}>📍 Raíces (Tiempo de Detención)</h4>
        <table style={{ width: '100%', marginBottom: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #4b5563' }}><th>Método</th><th>Raíz (t)</th></tr></thead>
          <tbody>
            <tr><td>Bisección</td><td>{data.raices.bis?.raiz?.toFixed(5)} s</td></tr>
            <tr><td>Newton-Raphson</td><td>{data.raices.new?.raiz?.toFixed(5)} s</td></tr>
            <tr><td>Secante</td><td>{data.raices.sec?.raiz?.toFixed(5)} s</td></tr>
          </tbody>
        </table>

        <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>📊 Integración (Distancia)</h4>
        <table style={{ width: '100%', marginBottom: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #4b5563' }}><th>Método</th><th>Distancia</th></tr></thead>
          <tbody>
            <tr><td>Trapecio</td><td>{data.integracion.trap?.toFixed(4)} m</td></tr>
            <tr><td>Simpson</td><td>{data.integracion.simp?.toFixed(4)} m</td></tr>
            <tr><td>Romberg</td><td>{data.integracion.romb?.toFixed(4)} m</td></tr>
            <tr><td><strong>Analítico</strong></td><td><strong>{data.integracion.analitica?.toFixed(4)} m</strong></td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  // MÓDULO 2: Deterioro
  if (data.raices && data.sistemas) {
    return (
      <div className="animate-fade-in">
        <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>⏱️ Raíces (Tiempo Límite)</h4>
        <table style={{ width: '100%', marginBottom: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #4b5563' }}><th>Método</th><th>Raíz (Años)</th></tr></thead>
          <tbody>
            <tr><td>Bisección</td><td>{data.raices.bis?.raiz?.toFixed(4)}</td></tr>
            <tr><td>Newton-Raphson</td><td>{data.raices.new?.raiz?.toFixed(4)}</td></tr>
            <tr><td>Secante</td><td>{data.raices.sec?.raiz?.toFixed(4)}</td></tr>
          </tbody>
        </table>

        <h4 style={{ color: '#10b981', marginBottom: '10px' }}>🧮 Sistemas Lineales (SPD)</h4>
        <table style={{ width: '100%', marginBottom: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #4b5563' }}><th>Método</th><th>x₁, x₂, x₃, x₄</th><th>Iteraciones</th></tr></thead>
          <tbody>
            <tr><td>LU</td><td>{data.sistemas.lu?.x?.map(v => v.toFixed(3)).join(', ')}</td><td>Directo</td></tr>
            <tr><td>Grad. Conjugado</td><td>{data.sistemas.cg?.x?.map(v => v.toFixed(3)).join(', ')}</td><td>{data.sistemas.cg?.historial?.length}</td></tr>
            <tr><td>Gauss-Seidel</td><td>{data.sistemas.gs?.x?.map(v => v.toFixed(3)).join(', ')}</td><td>{data.sistemas.gs?.historial?.length}</td></tr>
            <tr><td>Jacobi</td><td>{data.sistemas.jacobi?.x?.map(v => v.toFixed(3)).join(', ')}</td><td>{data.sistemas.jacobi?.historial?.length}</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  // MÓDULO 3: Oscilaciones
  if (data.edo && data.integracion) {
    // Tomamos el último estado de la EDO como resumen
    const ultimoRK4 = data.edo.rk4?.[data.edo.rk4.length - 1] || {};
    return (
      <div className="animate-fade-in">
        <h4 style={{ color: '#8b5cf6', marginBottom: '10px' }}>🌊 EDO (Estado Final RK4)</h4>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af' }}>Posición x(t)</span>
            <strong style={{ fontSize: '1.2rem', color: '#8b5cf6' }}>{ultimoRK4.x?.toFixed(4)} m</strong>
          </div>
          <div style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af' }}>Velocidad v(t)</span>
            <strong style={{ fontSize: '1.2rem', color: '#f43f5e' }}>{ultimoRK4.v?.toFixed(4)} m/s</strong>
          </div>
        </div>

        <h4 style={{ color: '#10b981', marginBottom: '10px' }}>⚡ Energía Acumulada ∫x(t)² dt</h4>
        <table style={{ width: '100%', marginBottom: '20px', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '1px solid #4b5563' }}><th>Método</th><th>Valor</th></tr></thead>
          <tbody>
            <tr><td>Trapecio</td><td>{data.integracion.trap?.toFixed(4)}</td></tr>
            <tr><td>Simpson</td><td>{data.integracion.simp?.toFixed(4)}</td></tr>
            <tr><td>Romberg</td><td>{data.integracion.romb?.toFixed(4)}</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  // MÓDULO 4: Sensores
  if (data.error_lagrange !== undefined || data.resultado) {
    const res = data.resultado || data; // Soporta ambos formatos de guardado
    return (
      <div className="animate-fade-in">
        <h4 style={{ color: '#10b981', marginBottom: '10px' }}>📡 Errores de Interpolación</h4>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af' }}>Error Lagrange</span>
            <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>{res.error_lagrange?.toExponential(3)}</strong>
          </div>
          <div style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af' }}>Error Newton</span>
            <strong style={{ fontSize: '1.1rem', color: '#f59e0b' }}>{res.error_newton?.toExponential(3)}</strong>
          </div>
          <div style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', fontSize: '0.8rem', color: '#9ca3af' }}>Error Spline</span>
            <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{res.error_spline?.toExponential(3)}</strong>
          </div>
        </div>
        {data.parametros_modificados && (
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Nodos usados: <strong>{data.parametros_modificados.n_nodos}</strong> | Ruido: <strong>{data.parametros_modificados.ruido}</strong>
          </p>
        )}
      </div>
    )
  }

  // FALLBACK: Si el JSON tiene otra estructura desconocida, lo muestra genérico
  return (
    <div style={{ background: '#1e1e1e', padding: '15px', borderRadius: '8px', overflowY: 'auto', maxHeight: '400px' }}>
      {renderGeneric(data)}
    </div>
  )
}