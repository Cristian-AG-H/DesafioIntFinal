# SIMTELE-RISK — Plataforma de Simulación y Análisis de Riesgos

Integrantes: 
- Luna Rojas Javier
- Quispe Espinal Cristian Alexander

Plataforma interactiva de métodos numéricos aplicada al modelado computacional de sistemas de transporte por cable urbano (inspirada en la infraestructura y topografía de Mi Teleférico, La Paz).

## 🚀 Alcance Matemático Implementado (Semana 1)
- **Sistemas Lineales ($A x = b, n \ge 4$):** Factorización LU (Doolittle), Método de Jacobi, Gauss-Seidel y Gradiente Conjugado (CG) con matrices SPD.
- **Teoría de Errores Transversal:** Evaluación estricta de error absoluto, relativo, porcentual, norma euclidiana del residuo $\|r\|_2$ y análisis de mal condicionamiento con $\kappa_2(A)$.
- **Escenarios Experimentales:** Implementación reproducible de escenarios NORMAL, ESTRÉS y MAL CONDICIONADO con análisis de estabilidad asintótica.
- **Persistencia Relacional:** Almacenamiento local mediante IndexedDB con exportación a sentencias SQL normalizadas bajo el estándar de 3FN.
