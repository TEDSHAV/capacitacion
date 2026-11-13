-- 20261113120000_create_course_evaluations_system.sql
-- Digital Evaluations System for Capacitación:
-- Master templates, questions with single-choice options, OSI evaluation instances, and participant submissions.

-- 1. Master Exam Templates per Course
CREATE TABLE IF NOT EXISTS public.capacitacion_evaluaciones_plantillas (
  id SERIAL PRIMARY KEY,
  id_curso INT REFERENCES public.catalogo_servicios(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  nota_aprobatoria NUMERIC(4,2) DEFAULT 14.00,
  duracion_minutos INT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Template Questions
CREATE TABLE IF NOT EXISTS public.capacitacion_evaluaciones_preguntas (
  id SERIAL PRIMARY KEY,
  plantilla_id INT REFERENCES public.capacitacion_evaluaciones_plantillas(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL DEFAULT 'single_choice', -- 'single_choice', 'true_false', 'multiple_choice'
  puntos NUMERIC(4,2) NOT NULL DEFAULT 2.00,
  orden INT NOT NULL DEFAULT 1,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb -- Array of { id: string, texto: string, es_correcta: boolean }
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_eval_preguntas_plantilla
  ON public.capacitacion_evaluaciones_preguntas(plantilla_id, orden);

-- 3. OSI Evaluation Instance (assigned by Capacitación coordinators)
CREATE TABLE IF NOT EXISTS public.capacitacion_osi_evaluaciones (
  id SERIAL PRIMARY KEY,
  id_osi INT NOT NULL REFERENCES public.ejecucion_osi(id) ON DELETE CASCADE,
  plantilla_id INT REFERENCES public.capacitacion_evaluaciones_plantillas(id) ON DELETE SET NULL,
  titulo VARCHAR(255) NOT NULL,
  nota_aprobatoria NUMERIC(4,2) DEFAULT 14.00,
  duracion_minutos INT DEFAULT NULL,
  preguntas JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot of questions with options & correct answers
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT uq_capacitacion_osi_evaluaciones_osi UNIQUE (id_osi)
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_osi_evaluaciones_osi
  ON public.capacitacion_osi_evaluaciones(id_osi);

-- 4. Participant Evaluation Submissions
CREATE TABLE IF NOT EXISTS public.capacitacion_evaluaciones_respuestas (
  id SERIAL PRIMARY KEY,
  osi_evaluacion_id INT REFERENCES public.capacitacion_osi_evaluaciones(id) ON DELETE CASCADE,
  id_osi INT NOT NULL,
  nro_sesion INT DEFAULT 1,
  cedula VARCHAR(30) NOT NULL,
  nombre_apellido VARCHAR(255) NOT NULL,
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb, -- Map of { question_id: selected_option_id }
  nota NUMERIC(4,2) NOT NULL,
  aprobado BOOLEAN NOT NULL,
  dispositivo VARCHAR(50) DEFAULT 'mobile_qr', -- 'mobile_qr' or 'kiosk'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_capacitacion_eval_osi_cedula UNIQUE (id_osi, cedula)
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_eval_respuestas_osi
  ON public.capacitacion_evaluaciones_respuestas(id_osi, cedula);

-- Seed default initial template: Evaluación General de Seguridad
DO $$
DECLARE
  v_template_id INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.capacitacion_evaluaciones_plantillas LIMIT 1) THEN
    INSERT INTO public.capacitacion_evaluaciones_plantillas (titulo, descripcion, nota_aprobatoria)
    VALUES ('Evaluación General de Seguridad y Salud en el Trabajo', 'Evaluación estándar de 10 preguntas (2 pts c/u) con 3 opciones de respuesta.', 14.00)
    RETURNING id INTO v_template_id;

    INSERT INTO public.capacitacion_evaluaciones_preguntas (plantilla_id, enunciado, tipo, puntos, orden, opciones)
    VALUES
      (v_template_id, '¿Cuál es el objetivo principal del uso de Equipos de Protección Personal (EPP)?', 'single_choice', 2.00, 1,
       '[{"id":"opt1","texto":"Minimizar o controlar el impacto de los riesgos residuales en el trabajador","es_correcta":true},{"id":"opt2","texto":"Eliminar la necesidad de aplicar controles de ingeniería","es_correcta":false},{"id":"opt3","texto":"Acelerar los tiempos de ejecución de las tareas","es_correcta":false}]'::jsonb),
      (v_template_id, 'Antes de iniciar cualquier trabajo de alto riesgo, ¿qué documento es indispensable verificar y firmar?', 'single_choice', 2.00, 2,
       '[{"id":"opt1","texto":"La factura fiscal del servicio","es_correcta":false},{"id":"opt2","texto":"El Permiso de Trabajo Seguro (PTS) y Análisis de Riesgo","es_correcta":true},{"id":"opt3","texto":"El organigrama de la empresa","es_correcta":false}]'::jsonb),
      (v_template_id, 'A partir de qué altura sobre el nivel del suelo se considera trabajo en altura según la normativa técnica general?', 'single_choice', 2.00, 3,
       '[{"id":"opt1","texto":"A partir de 1.80 metros (o 1.50m según estándar aplicable)","es_correcta":true},{"id":"opt2","texto":"A partir de 3.50 metros","es_correcta":false},{"id":"opt3","texto":"A partir de 5.00 metros","es_correcta":false}]'::jsonb),
      (v_template_id, '¿Qué debe hacer un trabajador si observa una condición insegura que pone en peligro su integridad física?', 'single_choice', 2.00, 4,
       '[{"id":"opt1","texto":"Ignorarla y continuar para no retrasar la producción","es_correcta":false},{"id":"opt2","texto":"Detener la actividad e informar inmediatamente al supervisor o comité de SSL","es_correcta":true},{"id":"opt3","texto":"Esperar al final de la jornada para comentarlo","es_correcta":false}]'::jsonb),
      (v_template_id, '¿Cuál de los siguientes es un elemento obligatorio en un sistema de protección contra caídas?', 'single_choice', 2.00, 5,
       '[{"id":"opt1","texto":"Arnés de cuerpo entero con eslinga y punto de anclaje certificado","es_correcta":true},{"id":"opt2","texto":"Cinturón lumbar simple","es_correcta":false},{"id":"opt3","texto":"Cuerda de mecate común","es_correcta":false}]'::jsonb),
      (v_template_id, 'En caso de presenciar un accidente laboral, ¿cuál es el primer paso según el protocolo de primeros auxilios (PAS)?', 'single_choice', 2.00, 6,
       '[{"id":"opt1","texto":"Proteger la escena para evitar nuevos lesionados","es_correcta":true},{"id":"opt2","texto":"Mover bruscamente al lesionado","es_correcta":false},{"id":"opt3","texto":"Suministrar agua o medicamentos de inmediato","es_correcta":false}]'::jsonb),
      (v_template_id, '¿Qué significa la sigla EPP en el ámbito de seguridad y salud en el trabajo?', 'single_choice', 2.00, 7,
       '[{"id":"opt1","texto":"Equipo de Producción Primaria","es_correcta":false},{"id":"opt2","texto":"Equipo de Protección Personal","es_correcta":true},{"id":"opt3","texto":"Estándar de Procedimiento Preventivo","es_correcta":false}]'::jsonb),
      (v_template_id, 'Para la extinción de un fuego originado en equipos eléctricos energizados (Clase C), ¿qué tipo de extintor es adecuado?', 'single_choice', 2.00, 8,
       '[{"id":"opt1","texto":"Dióxido de Carbono (CO2) o Polvo Químico Seco (PQS)","es_correcta":true},{"id":"opt2","texto":"Agua a presión directa","es_correcta":false},{"id":"opt3","texto":"Espuma química conductora","es_correcta":false}]'::jsonb),
      (v_template_id, '¿Cuál es la función del delegado de prevención según la LOPCYMAT?', 'single_choice', 2.00, 9,
       '[{"id":"opt1","texto":"Aplicar sanciones disciplinarias a los trabajadores","es_correcta":false},{"id":"opt2","texto":"Representar a los trabajadores en la promoción y vigilancia de las condiciones de seguridad y salud","es_correcta":true},{"id":"opt3","texto":"Fijar los salarios de la plantilla de personal","es_correcta":false}]'::jsonb),
      (v_template_id, '¿Cuál es la postura correcta para levantar una carga pesada desde el suelo?', 'single_choice', 2.00, 10,
       '[{"id":"opt1","texto":"Doblar la cintura manteniendo las piernas rectas","es_correcta":false},{"id":"opt2","texto":"Flexionar las rodillas, mantener la espalda recta y acercar la carga al cuerpo","es_correcta":true},{"id":"opt3","texto":"Girar el torso mientras se levanta el peso","es_correcta":false}]'::jsonb);
  END IF;
END $$;
