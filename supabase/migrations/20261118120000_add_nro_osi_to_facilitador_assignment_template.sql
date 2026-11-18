-- 20261118120000_add_nro_osi_to_facilitador_assignment_template.sql
-- Add nro_osi to the default Facilitator assignment template (email/WhatsApp).

UPDATE public.capacitacion_email_templates
SET
  subject = '🚀 Nueva Asignación Confirmada — OSI {{nro_osi}}',
  body = $BODY$Estimado/a {{facilitador_nombre}},

Confirmamos su asignación para dictar el curso {{curso}} con la empresa {{empresa}}.

🗓️ 1. Detalles del Servicio

•	📋 N° OSI: {{nro_osi}}
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

💻 4. Dinámica y Metodología en Aula

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
  updated_at = now()
WHERE slug = 'confirmacion-asignacion-facilitador';

-- Also update the older template if present so it also includes nro_osi
UPDATE public.capacitacion_email_templates
SET
  subject = '🚀 ¡Nueva Asignación Confirmada! — OSI {{nro_osi}}',
  body = $BODY$🚀 ¡Nueva Asignación Confirmada!

Estimado Sr. {{facilitador_nombre}}

Confirmamos su asignación para el curso de {{curso}} con la empresa {{empresa}}. Agradecemos su compromiso y entusiasmo para esta importante actividad.

🗓️ Detalles Clave de la Ejecución

  OSI          {{nro_osi}}       📋
  Fecha        {{fechas}}        📅
  Duración     {{duracion}} horas POR DÍA ⏱️
  Horario      {{horario}} AMBOS DÍAS ⏰
  Contacto     {{contacto}} 👤
  Dirección    {{direccion}} 📍

✅ Consignación y Requisitos Esenciales
Para asegurar la calidad y el cumplimiento de nuestras políticas:

💻 Equipo: Lleve su laptop con cargador y cables de conexión necesarios.

⚠️ Seguridad: Es indispensable llevar los EPP (Equipo de Protección Personal) correspondientes al tema y lugar de la actividad.

📤 Envío de Material (Máx. 24 horas): Toda la documentación (Factura, evaluaciones, listas, encuestas, etc., llena según la Orden de Compra) debe enviarse por Zoom en un máximo de 24 horas post-actividad.

📑 Calificaciones: La nota mínima aprobatoria es 14 puntos. Si algún participante obtiene una nota inferior, notifique inmediatamente a Capacitación.

📸 Registro: Envíe el Registro Fotográfico, Lista de Asistencia y Encuestas (evite mostrar elementos que comprometan a la empresa, según política interna).

🛑 Políticas del Facilitador (Importante)
Para mantener la profesionalidad y evitar inconvenientes:

Discreción: Evite emitir comentarios personales, juicios de valor u opiniones sobre los procedimientos internos, instalaciones, equipos, o personal de la empresa.

No Negociación: Evite llegar a acuerdos de horarios o actividades extras directamente con los participantes. Cualquier cambio en la planificación debe ser consultado y autorizado por la Coordinadora de Capacitación.

✨ Clave del Éxito
La actividad debe ser altamente dinámica. Utilizar prácticas y ejemplos es fundamental. Por favor, evite limitarse a leer la presentación, pues afecta negativamente la imagen del facilitador.

¡Esperamos que sea una jornada inolvidable y enriquecedora!

— Coordinación de Capacitación$BODY$,
  updated_at = now()
WHERE slug = 'asignacion-facilitador';
