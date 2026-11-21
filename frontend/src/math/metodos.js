// ==========================================
// 1. SISTEMAS LINEALES
// ==========================================
export function jacobi(A, b, x0, tol = 1e-5, maxIter = 50) {
  const n = A.length
  let x = [...x0], x_new = [...x0], historial = []
  for (let k = 0; k < maxIter; k++) {
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j]
      x_new[i] = (b[i] - sum) / A[i][i]
    }
    let error = Math.max(...x_new.map((val, i) => Math.abs(val - x[i])))
    historial.push({ iter: k + 1, x: [...x_new], error })
    x = [...x_new]
    if (error < tol) break
  }
  return { x, historial }
}

export function gaussSeidel(A, b, x0, tol = 1e-5, maxIter = 50) {
  const n = A.length
  let x = [...x0], historial = []
  for (let k = 0; k < maxIter; k++) {
    let x_old = [...x]
    for (let i = 0; i < n; i++) {
      let sum = 0
      for (let j = 0; j < n; j++) if (j !== i) sum += A[i][j] * x[j]
      x[i] = (b[i] - sum) / A[i][i]
    }
    let error = Math.max(...x.map((val, i) => Math.abs(val - x_old[i])))
    historial.push({ iter: k + 1, x: [...x], error })
    if (error < tol) break
  }
  return { x, historial }
}

export function gradienteConjugado(A, b, x0, tol = 1e-5, maxIter = 50) {
  const n = b.length
  let x = [...x0]
  let r = b.map((bi, i) => bi - A[i].reduce((sum, aij, j) => sum + aij * x[j], 0))
  let p = [...r]
  let rsold = r.reduce((sum, ri) => sum + ri * ri, 0)
  const historial = []

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
    historial.push({ iter: iter + 1, x: [...x], error: Math.sqrt(rsold) })
  }
  return { x, historial }
}

export function luDoolittle(A, b) {
  const n = A.length
  let L = Array.from({ length: n }, () => Array(n).fill(0))
  let U = Array.from({ length: n }, () => Array(n).fill(0))
  
  for (let i = 0; i < n; i++) {
    L[i][i] = 1
    for (let j = i; j < n; j++) {
      let sum = 0
      for (let k = 0; k < i; k++) sum += L[i][k] * U[k][j]
      U[i][j] = A[i][j] - sum
    }
    for (let j = i + 1; j < n; j++) {
      let sum = 0
      for (let k = 0; k < i; k++) sum += L[j][k] * U[k][i]
      L[j][i] = (A[j][i] - sum) / U[i][i]
    }
  }

  // Sustitución hacia adelante (Ly = b)
  let y = Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j < i; j++) sum += L[i][j] * y[j]
    y[i] = b[i] - sum
  }

  // Sustitución hacia atrás (Ux = y)
  let x = Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0
    for (let j = i + 1; j < n; j++) sum += U[i][j] * x[j]
    x[i] = (y[i] - sum) / U[i][i]
  }
  return { x, L, U }
}

// ==========================================
// 2. INTERPOLACIÓN
// ==========================================
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

export function newtonInterpolacion(nodos, x) {
  const n = nodos.length
  const coef = nodos.map(nodo => nodo.y)
  const tablaIteraciones = [[...coef]]

  for (let j = 1; j < n; j++) {
    for (let i = n - 1; i >= j; i--) {
      coef[i] = (coef[i] - coef[i - 1]) / (nodos[i].t - nodos[i - j].t)
    }
    tablaIteraciones.push([...coef])
  }

  let resultado = coef[0]
  let producto = 1
  for (let i = 1; i < n; i++) {
    producto *= (x - nodos[i - 1].t)
    resultado += coef[i] * producto
  }
  return { valor: resultado, iteraciones: tablaIteraciones }
}

// ==========================================
// 3. RAÍCES
// ==========================================
export function biseccionDetallada(f, a, b, tol = 1e-5, maxIter = 50) {
  let iter = 0, c = a, error = 100
  const historial = []
  if (f(a) * f(b) > 0) throw new Error("El intervalo no encierra una raíz")
  
  while (error > tol && iter < maxIter) {
    c = (a + b) / 2
    if (f(c) === 0) break
    if (f(a) * f(c) < 0) b = c
    else a = c
    error = Math.abs(b - a)
    historial.push({ iter: iter + 1, a, b, c, fc: f(c), error })
    iter++
  }
  return { raiz: c, historial }
}

export function newtonRaphsonDetallado(f, df, x0, tol = 1e-5, maxIter = 50) {
  let x = x0, iter = 0, error = 100
  const historial = []
  while (error > tol && iter < maxIter) {
    const fx = f(x)
    const dfx = df(x)
    if (dfx === 0) throw new Error("Derivada cero")
    const x_new = x - fx / dfx
    error = Math.abs(x_new - x)
    historial.push({ iter: iter + 1, x: x_new, fx: f(x_new), error })
    x = x_new
    iter++
  }
  return { raiz: x, historial }
}

export function secanteDetallada(f, x0, x1, tol = 1e-5, maxIter = 50) {
  let iter = 0, error = 100
  const historial = []
  while (error > tol && iter < maxIter) {
    const fx0 = f(x0)
    const fx1 = f(x1)
    if (fx1 - fx0 === 0) throw new Error("División por cero")
    const x2 = x1 - (fx1 * (x1 - x0)) / (fx1 - fx0)
    error = Math.abs(x2 - x1)
    historial.push({ iter: iter + 1, x: x2, fx: f(x2), error })
    x0 = x1
    x1 = x2
    iter++
  }
  return { raiz: x1, historial }
}

// ==========================================
// 4. INTEGRACIÓN
// ==========================================
export function trapecio(f, a, b, n) {
  const h = (b - a) / n
  let suma = f(a) + f(b)
  for (let i = 1; i < n; i++) suma += 2 * f(a + i * h)
  return (h / 2) * suma
}

export function simpson13(f, a, b, n) {
  if (n % 2 !== 0) n++
  const h = (b - a) / n
  let suma = f(a) + f(b)
  for (let i = 1; i < n; i++) suma += (i % 2 === 0 ? 2 : 4) * f(a + i * h)
  return (h / 3) * suma
}

export function romberg(f, a, b, maxIter = 5) {
  const R = Array.from({ length: maxIter }, () => Array(maxIter).fill(0))
  let h = b - a
  R[0][0] = 0.5 * h * (f(a) + f(b))
  const historial = [{ iter: 0, h, R: [R[0][0]] }]

  for (let i = 1; i < maxIter; i++) {
    h /= 2
    let suma = 0
    for (let k = 1; k <= Math.pow(2, i - 1); k++) suma += f(a + (2 * k - 1) * h)
    R[i][0] = 0.5 * R[i - 1][0] + suma * h
    
    const fila = [R[i][0]]
    for (let j = 1; j <= i; j++) {
      const factor = Math.pow(4, j)
      R[i][j] = R[i][j - 1] + (R[i][j - 1] - R[i - 1][j - 1]) / (factor - 1)
      fila.push(R[i][j])
    }
    historial.push({ iter: i, h, R: fila })
  }
  return { valor: R[maxIter - 1][maxIter - 1], historial }
}

// ==========================================
// 5. EDO
// ==========================================
export function rk2(f, t0, y0, t_end, h) {
  let t = t0, y = y0
  const historial = [{ t, y }]
  while (t < t_end) {
    const k1 = f(t, y)
    const k2 = f(t + h, y + h * k1)
    const y_new = y + (h / 2) * (k1 + k2)
    historial.push({ t: t + h, y: y_new, k1, k2 })
    y = y_new
    t += h
  }
  return historial
}

export function rk4(f, t0, y0, t_end, h) {
  let t = t0, y = y0
  const historial = [{ t, y }]
  while (t < t_end) {
    const k1 = f(t, y)
    const k2 = f(t + h / 2, y + (h / 2) * k1)
    const k3 = f(t + h / 2, y + (h / 2) * k2)
    const k4 = f(t + h, y + h * k3)
    const y_new = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4)
    historial.push({ t: t + h, y: y_new, k1, k2, k3, k4 })
    y = y_new
    t += h
  }
  return historial
}

export function rk4Sistema(f, t0, y0, t_end, h) {
  let t = t0, y = [...y0]
  const historial = [{ t, x: y[0], v: y[1] }]
  while (t < t_end) {
    const k1 = f(t, y)
    const k2 = f(t + h/2, y.map((yi, i) => yi + (h/2)*k1[i]))
    const k3 = f(t + h/2, y.map((yi, i) => yi + (h/2)*k2[i]))
    const k4 = f(t + h, y.map((yi, i) => yi + h*k3[i]))
    y = y.map((yi, i) => yi + (h/6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]))
    t = t + h
    historial.push({ t, x: y[0], v: y[1] })
  }
  return historial
}

// ==========================================
// 6. SPLINES CÚBICOS (Para Módulo 4)
// ==========================================
export function splineCubico(nodos, x) {
  const n = nodos.length
  const h = []
  const alpha = []
  for (let i = 0; i < n - 1; i++) h[i] = nodos[i + 1].t - nodos[i].t
  for (let i = 1; i < n - 1; i++) {
    alpha[i] = (3 / h[i]) * (nodos[i + 1].y - nodos[i].y) - (3 / h[i - 1]) * (nodos[i].y - nodos[i - 1].y)
  }
  
  const l = [1], mu = [0], z = [0]
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (nodos[i + 1].t - nodos[i - 1].t) - h[i - 1] * mu[i - 1]
    mu[i] = h[i] / l[i]
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
  }
  l[n - 1] = 1
  
  const c = new Array(n).fill(0), b = new Array(n - 1).fill(0), d = new Array(n - 1).fill(0)
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1]
    b[j] = (nodos[j + 1].y - nodos[j].y) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3
    d[j] = (c[j + 1] - c[j]) / (3 * h[j])
  }

  // Evaluar en x
  let i = n - 2
  for (let j = 0; j < n - 1; j++) {
    if (x >= nodos[j].t && x <= nodos[j + 1].t) { i = j; break }
  }
  const dx = x - nodos[i].t
  return nodos[i].y + b[i] * dx + c[i] * Math.pow(dx, 2) + d[i] * Math.pow(dx, 3)
}