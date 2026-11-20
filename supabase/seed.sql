-- Casos de estudio (los 4 módulos)
INSERT INTO caso_estudio (id, nombre, modelo_version) VALUES
  (1, 'Detención de emergencia',            'v1'),
  (2, 'Deterioro mecánico y mantenimiento', 'v1'),
  (3, 'Oscilaciones por viento',            'v1'),
  (4, 'Reconstrucción de sensores',         'v1');

-- Escenarios NORMAL / ESTRES / MAL_CONDICIONADO por caso
-- (parámetros sintéticos; ajústalos cuando definas cada módulo)

-- Módulo 1
INSERT INTO escenario (caso_id, tipo, parametros_json, fuente_datos) VALUES
 (1,'NORMAL',        '{"v0":10,"a":2.0,"t_reaccion":0.5,"h":0.1,"x_disponible":30}', 'sintético'),
 (1,'ESTRES',        '{"v0":18,"a":1.5,"t_reaccion":1.2,"h":0.01,"x_disponible":40}', 'sintético'),
 (1,'MAL_CONDICIONADO','{"v0":10,"a":2.0,"t_reaccion":0.5,"h":0.1,"x_disponible":30,"nota":"raíz con derivada pequeña cerca de t_det"}', 'sintético');

-- Módulo 2
INSERT INTO escenario (caso_id, tipo, parametros_json, fuente_datos) VALUES
 (2,'NORMAL',        '{"D0":0.0,"alpha":0.5,"beta":0.02,"D_umbral":5.0,"n":4,"tol":1e-8}', 'sintético'),
 (2,'ESTRES',        '{"D0":0.0,"alpha":0.5,"beta":0.02,"D_umbral":5.0,"n":10,"tol":1e-11}', 'sintético'),
 (2,'MAL_CONDICIONADO','{"D0":0.0,"alpha":0.5,"beta":0.02,"D_umbral":5.0,"n":4,"tol":1e-8,"nota":"matriz casi singular kappa~3.8e6"}', 'sintético');

-- Módulo 3
INSERT INTO escenario (caso_id, tipo, parametros_json, fuente_datos) VALUES
 (3,'NORMAL',        '{"m":1.0,"c":0.2,"k":4.0,"F0":0.0,"T":20,"h":0.1}', 'sintético'),
 (3,'ESTRES',        '{"m":1.0,"c":0.02,"k":4.0,"F0":0.5,"T":40,"h":0.05}', 'sintético'),
 (3,'MAL_CONDICIONADO','{"m":1.0,"c":0.2,"k":4.0,"F0":0.0,"T":20,"h":1.0,"nota":"paso grande: RK4 inestable"}', 'sintético');

-- Módulo 4
INSERT INTO escenario (caso_id, tipo, parametros_json, fuente_datos) VALUES
 (4,'NORMAL',        '{"n_nodos":8,"ruido":0.0,"ocultos":3,"frontera":"natural"}', 'sintético'),
 (4,'ESTRES',        '{"n_nodos":8,"ruido":0.05,"ocultos":3,"frontera":"natural"}', 'sintético'),
 (4,'MAL_CONDICIONADO','{"n_nodos":15,"ruido":0.0,"ocultos":5,"frontera":"natural","nota":"nodos equiespaciados tipo Runge"}', 'sintético');