// Genera los datos sintéticos base: y = sin(t) + 0.3*cos(2.5t)
export function generarDatosSinteticos(n, ruido = 0) {
  const nodos = []
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / (n - 1); // de 0 a 2PI
    let y = Math.sin(t) + 0.3 * Math.cos(2.5 * t)
    if (ruido > 0) y += (Math.random() - 0.5) * ruido
    nodos.push({ t, y })
  }
  return nodos
}

// Implementación de Lagrange
export function lagrange(nodos, x) {
  let sum = 0
  for (let i = 0; i < nodos.length; i++) {
    let term = nodos[i].y
    for (let j = 0; j < nodos.length; j++) {
      if (i !== j) {
        term *= (x - nodos[j].t) / (nodos[i].t - nodos[j].t)
      }
    }
    sum += term
  }
  return sum
}

// Función para interpolar todo un arreglo de puntos y calcular el error
export function evaluarInterpolacion(nodos, puntosEvaluacion) {
  const resultados = []
  const ref = puntosEvaluacion.map(x => Math.sin(x) + 0.3 * Math.cos(2.5 * x))
  
  for (let x of puntosEvaluacion) {
    const y_aprox = lagrange(nodos, x)
    const y_real = Math.sin(x) + 0.3 * Math.cos(2.5 * x)
    resultados.push({
      x,
      y_aprox,
      y_real,
      error_abs: Math.abs(y_real - y_aprox)
    })
  }
  return resultados
}