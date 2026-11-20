-- ============================================================
-- SIMTELE-RISK · Esquema mínimo (6 tablas)
-- Ejecutar una vez en Supabase → SQL Editor
-- ============================================================

-- 1) Casos de estudio (4 módulos fijos)
CREATE TABLE caso_estudio (
  id              SMALLINT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  modelo_version  TEXT NOT NULL DEFAULT 'v1'
);

-- 2) Escenarios (3 por caso: NORMAL / ESTRES / MAL_CONDICIONADO)
CREATE TABLE escenario (
  id              SERIAL PRIMARY KEY,
  caso_id         SMALLINT NOT NULL REFERENCES caso_estudio(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL CHECK (tipo IN ('NORMAL','ESTRES','MAL_CONDICIONADO')),
  parametros_json JSONB NOT NULL,          -- todos los parámetros de entrada
  fuente_datos    TEXT,                    -- "sintético", "supuesto", "referencia"
  UNIQUE (caso_id, tipo)
);

-- 3) Simulación (una corrida completa)
CREATE TABLE simulacion (
  id              BIGSERIAL PRIMARY KEY,
  escenario_id    INT NOT NULL REFERENCES escenario(id) ON DELETE CASCADE,
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario         TEXT,                    -- opcional (equipo o alumno)
  estado          TEXT NOT NULL DEFAULT 'EXITOSA'
                  CHECK (estado IN ('EXITOSA','FALLIDA','PARCIAL'))
);

-- 4) Ejecución de un método dentro de una simulación
CREATE TABLE ejecucion_metodo (
  id              BIGSERIAL PRIMARY KEY,
  simulacion_id   BIGINT NOT NULL REFERENCES simulacion(id) ON DELETE CASCADE,
  metodo          TEXT NOT NULL,           -- 'RK4', 'LU', 'Lagrange', etc.
  tolerancia      DOUBLE PRECISION,
  paso            DOUBLE PRECISION,
  max_iter        INT,
  convergio       BOOLEAN,
  tiempo_ms       DOUBLE PRECISION
);

-- 5) Iteraciones / refinamientos (una fila por iteración, o un solo JSONB con todas)
CREATE TABLE iteracion_resultado (
  id              BIGSERIAL PRIMARY KEY,
  ejecucion_id    BIGINT NOT NULL REFERENCES ejecucion_metodo(id) ON DELETE CASCADE,
  numero          INT NOT NULL,
  aproximacion    JSONB,                   -- valor(es) de la iteración
  residual        DOUBLE PRECISION,
  error_abs       DOUBLE PRECISION,
  error_rel       DOUBLE PRECISION
);

-- 6) Resumen final por ejecución (1:1 con ejecucion_metodo)
CREATE TABLE resultado_resumen (
  id              BIGSERIAL PRIMARY KEY,
  ejecucion_id    BIGINT NOT NULL UNIQUE REFERENCES ejecucion_metodo(id) ON DELETE CASCADE,
  referencia      TEXT,                    -- 'analítica', 'RK4 h=0.001', etc.
  valor_json      JSONB NOT NULL,          -- resultado principal (tiempo, distancia, etc.)
  metrica_error   JSONB,                   -- {abs, rel, pct, residual, kappa}
  interpretacion  TEXT                     -- conclusión breve (opcional)
);

-- Índices útiles para el historial
CREATE INDEX idx_escenario_caso ON escenario(caso_id);
CREATE INDEX idx_simulacion_escenario ON simulacion(escenario_id);
CREATE INDEX idx_ejecucion_simulacion ON ejecucion_metodo(simulacion_id);
CREATE INDEX idx_iteracion_ejecucion ON iteracion_resultado(ejecucion_id);

-- ============================================================
-- Seguridad: permitir lectura/escritura al rol anon (proyecto educativo)
-- Si más adelante quieres auth, cambia esto por políticas por usuario.
-- ============================================================
ALTER TABLE caso_estudio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE escenario           ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulacion          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejecucion_metodo    ENABLE ROW LEVEL SECURITY;
ALTER TABLE iteracion_resultado ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultado_resumen   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica" ON caso_estudio        FOR SELECT USING (true);
CREATE POLICY "lectura publica" ON escenario           FOR SELECT USING (true);
CREATE POLICY "lectura publica" ON simulacion          FOR SELECT USING (true);
CREATE POLICY "lectura publica" ON ejecucion_metodo    FOR SELECT USING (true);
CREATE POLICY "lectura publica" ON iteracion_resultado FOR SELECT USING (true);
CREATE POLICY "lectura publica" ON resultado_resumen   FOR SELECT USING (true);

CREATE POLICY "escritura publica" ON simulacion          FOR INSERT WITH CHECK (true);
CREATE POLICY "escritura publica" ON ejecucion_metodo    FOR INSERT WITH CHECK (true);
CREATE POLICY "escritura publica" ON iteracion_resultado FOR INSERT WITH CHECK (true);
CREATE POLICY "escritura publica" ON resultado_resumen   FOR INSERT WITH CHECK (true);