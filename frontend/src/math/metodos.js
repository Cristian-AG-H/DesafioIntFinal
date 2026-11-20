// ==========================================
// 1. INTERPOLACIÓN
// ==========================================
export function generarDatosSinteticos(n, ruido = 0) {
  const nodos = []
  for (let i = 0; i < n; i++) {
    const t = (i * 2 * Math.PI) / (n - 1)
    let y = Math.sin(t) + 0.3 * Math.cos(2.5 * t)
    if (ruido > 0) y += (Math.random() - 0.5) * ruido
    nodos.push({ t, y })
  }
  return nodos
}

export function lagrange(nodos, x) {
  let sum = 0
  for (let i = 0; i < nodos.length; i++) {
    let term = nodos[i].y
    for (let j = 0; j < nodos.length; j++) {
      if (i !== j) term *= (x - nodos[j].t) / (nodos[i].t - nodos[j].t)
    }
    sum += term
  }
  return sum
}

// Newton por Diferencias Divididas
export function newtonInterpolacion(nodos, x) {
  const n = nodos.length
  const coef = nodos.map(nodo => nodo.y)
  
  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      coef[i] = (coef[i] - coef[i - 1]) / (nodos[i].t - nodos[i - j].t)
    }
  }

  let resultado = coef[0]
  let producto = 1
  for (let i = 1; i < n; i++) {
    producto *= (x - nodos[i - 1].t)
    resultado += coef[i] * producto
  }
  return resultado
}

// ==========================================
// 2. RAÍCES (Para el Módulo 2)
// ==========================================
// Busca el cero de una función f en un intervalo [a, b]
export function biseccion(f, a, b, tol = 1e-5, maxIter = 50) {
  let iter = 0, c = a, error = 100
  if (f(a) * f(b) > 0) throw new Error("El intervalo no encierra una raíz")
  
  const historial = []
  while (error > tol && iter < maxIter) {
    c = (a + b) / 2
    if (f(c) === 0) break
    if (f(a) * f(c) < 0) b = c
    else a = c
    
    error = Math.abs(b - a)
    historial.push({ iter, c, error })
    iter++
  }
  return { raiz: c, iteraciones: iter, historial }
}

export function newtonRaphson(f, df, x0, tol = 1e-5, maxIter = 50) {
  let x = x0, iter = 0, error = 100
  const historial = []
  while (error > tol && iter < maxIter) {
    const fx = f(x)
    const dfx = df(x)
    if (dfx === 0) throw new Error("Derivada cero, división por cero")
    const x_new = x - fx / dfx
    error = Math.abs(x_new - x)
    x = x_new
    historial.push({ iter, x, error })
    iter++
  }
  return { raiz: x, iteraciones: iter, historial }
}

// ==========================================
// 3. INTEGRACIÓN (Para Módulos 1 y 3)
// ==========================================
export function trapecio(f, a, b, n) {
  const h = (b - a) / n
  let suma = f(a) + f(b)
  for (let i = 1; i < n; i++) suma += 2 * f(a + i * h)
  return (h / 2) * suma
}

export function simpson13(f, a, b, n) {
  if (n % 2 !== 0) n++ // n debe ser par
  const h = (b - a) / n
  let suma = f(a) + f(b)
  for (let i = 1; i < n; i++) {
    suma += (i % 2 === 0 ? 2 : 4) * f(a + i * h)
  }
  return (h / 3) * suma
}

// ==========================================
// 4. EDO (Para Módulos 1 y 3)
// ==========================================
// f(t, y) retorna la derivada. Resuelve dy/dt = f(t, y)
export function rk4(f, t0, y0, t_end, h) {
  let t = t0
  let y = y0
  const resultados = [{ t, y }]
  
  while (t < t_end) {
    const k1 = f(t, y)
    const k2 = f(t + h/2, y + (h/2)*k1)
    const k3 = f(t + h/2, y + (h/2)*k2)
    const k4 = f(t + h, y + h*k3)
    
    y = y + (h/6) * (k1 + 2*k2 + 2*k3 + k4)
    t = t + h
    resultados.push({ t, y })
  }
  return resultados
}

// ==========================================
// 5. ROMBERG (Para Módulo 1 y 3)
// ==========================================
export function romberg(f, a, b, maxIter = 5) {
  const R = Array.from({ length: maxIter }, () => Array(maxIter).fill(0))
  let h = b - a
  R[0][0] = 0.5 * h * (f(a) + f(b))

  for (let i = 1; i < maxIter; i++) {
    h /= 2
    let suma = 0
    for (let k = 1; k <= Math.pow(2, i - 1); k++) {
      suma += f(a + (2 * k - 1) * h)
    }
    R[i][0] = 0.5 * R[i - 1][0] + suma * h
    
    for (let j = 1; j <= i; j++) {
      const factor = Math.pow(4, j)
      R[i][j] = R[i][j - 1] + (R[i][j - 1] - R[i - 1][j - 1]) / (factor - 1)
    }
  }
  // Retorna la mejor aproximación (última fila, última columna)
  return R[maxIter - 1][maxIter - 1] 
}

// ==========================================
// 6. GRADIENTE CONJUGADO (Sistemas Lineales)
// ==========================================
export function gradienteConjugado(A, b, x0, tol = 1e-6, maxIter = 50) {
  const n = b.length
  let x = [...x0]
  let r = b.map((bi, i) => bi - A[i].reduce((sum, aij, j) => sum + aij * x[j], 0))
  let p = [...r]
  let rsold = r.reduce((sum, ri) => sum + ri * ri, 0)
  
  for (let iter = 0; iter < maxIter; iter++) {
    if (Math.sqrt(rsold) < tol) break
    const Ap = A.map(row => row.reduce((sum, aij, j) => sum + aij * p[j], 0))
    const alpha = rsold / p.reduce((sum, pi, i) => sum + pi * Ap[i], 0)
    
    x = x.map((xi, i) => xi + alpha * p[i])
    r = r.map((ri, i) => ri - alpha * Ap[i])
    
    const rsnew = r.reduce((sum, ri) => sum + ri * ri, 0)
    const beta = rsnew / rsold
    
    p = p.map((pi, i) => r[i] + beta * pi)
    rsold = rsnew
  }
  return x
}