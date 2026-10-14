-- 20261014160000_add_facilitador_whatsapp_assignment_template.sql
-- New email/WhatsApp template for Facilitator assignment confirmation.
-- Populates course details, dates, hours per day, contact, and economic conditions (honorarios, traslado, impresion).

INSERT INTO public.capacitacion_email_templates
  (name, slug, event_type, subject, body, is_default, is_active)
VALUES (
  'Confirmación de Asignación a Facilitador',
  'confirmacion-asignacion-facilitador',
  'asignacion_facilitador',
  '🚀 Nueva Asignación Confirmada',
  $BODY$Estimado/a {{facilitador_nombre}},

Confirmamos su asignación para dictar el curso {{curso}} con la empresa {{empresa}}.

🗓️ 1. Detalles del Servicio
•	📅 Fechas: {{fechas}}
•	⏱️ Duración: {{duracion}} horas por día
•	⏰ Horario: {{horario}}
•	👤 Contacto: {{contacto}}
•	📍 Dirección: {{direccion}}

💰 2. Condiciones Económicas
•	💵 Honorarios: {{honorarios}}
•	🚗 Traslado: {{traslado}}
•	🖨️ Impresiones / Material: {{impresion}}

💻 3. Requisitos Esenciales
•	💻 Laptop y Cables: Llevar equipo propio con cargador y conectores/adaptadores necesarios.
•	🦺 EPP: Usar Equipo de Protección Personal adecuado a la actividad y al lugar.
•	Documento de Identidad: Es indispensable llevar su Cédula de Identidad (o identificación oficial) para el ingreso a las instalaciones.
•	⏰ Puntualidad: Presentarse con suficiente anticipación para coordinar el inicio formal de la sesión.
•	👔 Imagen Profesional: Asistir con vestimenta presentable, acorde al entorno corporativo/técnico.

4. Dinámica y Metodología en Aula
•	🗣️ No Leer Presentaciones: Evitar limitarse a la lectura de láminas; utilice ejemplos reales y casos prácticos.
•	⚡ Dinámicas Activas: Implementar dinámicas grupales e interactuar constantemente para mantener al público atento y participativo.
•	🧠 Pausas Activas: Realizar pausas activas para renovar la energía de los participantes durante la jornada.

📤 5. Entregables en Sistema PRISMA (Máximo 24 horas post-actividad)
Es fundamental cargar en la plataforma Prisma los siguientes respaldos:
•	📑 Lista de Asistencia firmada.
•	💯 Notas / Calificaciones (Nota mínima aprobatoria: 14 puntos; notificar inmediatamente si hay desaprobados).
•	 Encuestas digital código QR
•	📸 Registro Fotográfico (Cuidar la imagen institucional y confidencialidad).

🛑 5. Políticas Principales
•	🔒 Discreción: Evitar emitir juicios u opiniones personales sobre las instalaciones, equipos o personal del cliente.
•	🚫 No Negociación Directa: No pactar cambios de horario o actividades adicionales con los participantes. Todo ajuste debe autorizarlo la Coordinación de Capacitación.

✨ 6. Clave del Éxito
•	🎯 Mantener una dinámica 100% práctica y participativa. Evitar la lectura continua de las láminas.

¡Éxitos en la jornada!
— Coordinación de Capacitación$BODY$,
  false,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  updated_at = now();
