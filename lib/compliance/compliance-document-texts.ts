/**
 * Full Text and Structured Specifications for Mandatory Facilitator Compliance Documents
 * SHA DE VENEZUELA, C.A.
 */

export interface MatrixRow {
  actividad: string;
  tipoPeligro: string;
  condicionInsegura: string[];
  efectosSalud: string[];
  probabilidad: "BAJA" | "MEDIA" | "ALTA";
  severidad: "BAJA" | "MEDIA" | "ALTA";
  nivelRiesgo: "TOLERABLE" | "MODERADO" | "IMPORTANTE";
  controlesFuente: string[];
  controlesMedio: string[];
  controlesTrabajador: string[];
}

export const IDENTIFICACION_PELIGROS_MATRIZ: MatrixRow[] = [
  {
    actividad: "Actividad 1: Traslado Casa - Centro de trabajo (Viceversa)",
    tipoPeligro: "FÍSICO",
    condicionInsegura: [
      "Caída a un mismo nivel: Presencia de objetos mal ubicados, pisar en falso, superficie resbaladiza.",
      "Caída de diferente nivel: Al subir y bajar del vehículo o unidad de transporte público/privado.",
      "Golpeado contra: Estructura del vehículo, objetos fijos en unidades de transporte, colisión entre vehículos o personas.",
    ],
    efectosSalud: [
      "Luxaciones sin desplazamientos, dislocación, heridas, traumatismo superficial, fracturas, esguinces y/o torceduras.",
    ],
    probabilidad: "BAJA",
    severidad: "MEDIA",
    nivelRiesgo: "TOLERABLE",
    controlesFuente: ["N/A"],
    controlesMedio: [
      "Mantener plan de capacitación para dar información sobre actos y condiciones inseguras en el traslado.",
      "Informar sobre los medios seguros y uso correcto del transporte.",
    ],
    controlesTrabajador: [
      "Camine con precaución respetando demarcaciones peatonales y vehiculares.",
      "Espere a que el vehículo se detenga por completo antes de subir o bajar.",
      "Evite conductas lúdicas y no utilice equipos distractores (celular) al transitar o abordar.",
      "Reporte inmediatamente a su supervisor cualquier condición insegura detectada.",
    ],
  },
  {
    actividad: "Actividad 1: Traslado Casa - Centro de trabajo (Cont.)",
    tipoPeligro: "FÍSICO / BIOLÓGICO",
    condicionInsegura: [
      "Incendio y explosión en unidades de transporte por fallas mecánicas o eléctricas.",
      "Exposición a virus, bacterias y hongos en vías de acceso y transporte público.",
      "Picaduras o mordeduras de animales e insectos ponzoñosos en tránsito.",
    ],
    efectosSalud: [
      "Quemaduras, asfixia, intoxicación, infecciones respiratorias o gastrointestinales, fiebre, irritación.",
    ],
    probabilidad: "BAJA",
    severidad: "MEDIA",
    nivelRiesgo: "TOLERABLE",
    controlesFuente: ["N/A"],
    controlesMedio: [
      "Establecer plan de contingencia y protocolos de emergencia para traslados.",
      "Promover medidas higiénicas y sanitarias preventivas.",
    ],
    controlesTrabajador: [
      "Evacue el vehículo y diríjase a zona segura ante conato de incendio.",
      "Mantenga higiene de manos antes y después del traslado; evite frotarse ojos, nariz o boca.",
      "No intente manipular animales o insectos ponzoñosos en el trayecto.",
    ],
  },
  {
    actividad: "Actividad 2: Desplazamiento en instalaciones de la empresa",
    tipoPeligro: "FÍSICO / PSICOSOCIAL / METEOROLÓGICO",
    condicionInsegura: [
      "Caída a mismo nivel por pisos húmedos, obstáculos o cables en pasillos.",
      "Caída en escaleras o desniveles.",
      "Golpeado contra mobiliario de oficina, gavetas o archivadores abiertos.",
      "Robo, hurto o situaciones de pánico ante emergencias naturales (sismos, lluvias).",
    ],
    efectosSalud: [
      "Contusiones, traumatismos superficiales, esguinces, estrés postraumático, ansiedad.",
    ],
    probabilidad: "MEDIA",
    severidad: "MEDIA",
    nivelRiesgo: "MODERADO",
    controlesFuente: [
      "Señalización temporal de advertencia (avisos 'Piso Mojado' según Norma COVENIN 187).",
      "Mobiliario ergonómico libre de bordes cortantes y archivadores con traba.",
    ],
    controlesMedio: [
      "Mantenimiento de pasillos despejados y niveles óptimos de iluminación (COVENIN 2249).",
      "Rutas de evacuación señalizadas y simulacros periódicos.",
    ],
    controlesTrabajador: [
      "Uso de pasamanos en escaleras y paso firme.",
      "Mantener cajones y archivadores cerrados después de usarlos.",
      "Conocer rutas de escape y puntos de concentración de la sede.",
    ],
  },
  {
    actividad: "Actividad 3: Dictado de sesiones formativas (presenciales) en aula",
    tipoPeligro: "FÍSICO / DISERGONÓMICO / PSICOSOCIAL",
    condicionInsegura: [
      "Bipedestación prolongada (de pie caminando o estático durante horas de clase).",
      "Uso continuado de computador, pantallas, videobeam y equipos de sonido.",
      "Reflejos o iluminación deficiente/excesiva en el salón de capacitación.",
      "Contacto con equipos eléctricos energizados (cables, regletas, tomas).",
      "Exigencia vocal continua y factores estresores por gestión del grupo.",
    ],
    efectosSalud: [
      "Fatiga muscular en miembros inferiores, lumbalgia, fatiga visual, cefalea, disfonía, estrés laboral.",
    ],
    probabilidad: "MEDIA",
    severidad: "MEDIA",
    nivelRiesgo: "MODERADO",
    controlesFuente: [
      "Verificación previa de instalaciones eléctricas y equipos audiovisuales certificados.",
      "Configuración adecuada de brillo, contraste e iluminación en sala.",
    ],
    controlesMedio: [
      "Programación de pausas activas y descansos estructurados cada 60–90 minutos.",
      "Aulas climatizadas con hidratación disponible permanente para el facilitador.",
    ],
    controlesTrabajador: [
      "Alternar posturas (sentado y de pie) durante explicaciones teóricas.",
      "Realizar ejercicios de estiramiento y relajación muscular en las pausas.",
      "Hidratación constante y modulación adecuada de la voz con apoyo de micrófono.",
      "Reportar de inmediato cualquier equipo o cable en condiciones defectuosas.",
    ],
  },
  {
    actividad: "Actividad 4: Actividades en locaciones externas y plantas de clientes",
    tipoPeligro: "FÍSICO / QUÍMICO / INDUSTRIAL",
    condicionInsegura: [
      "Desplazamiento por áreas operativas, patios industriales o talleres del cliente.",
      "Exposición a ruido industrial, tránsito de montacargas o maquinarias pesadas.",
      "Condiciones atmosféricas o ambientales variables en campo.",
      "Equipos o tableros ajenos a la empresa.",
    ],
    efectosSalud: [
      "Traumatismos, hipoacusia por ruido, quemaduras, insolación, intoxicación por gases.",
    ],
    probabilidad: "MEDIA",
    severidad: "ALTA",
    nivelRiesgo: "MODERADO",
    controlesFuente: ["N/A"],
    controlesMedio: [
      "Coordinación previa de seguridad entre SHA de Venezuela y el cliente contratante.",
      "Verificación de inducción de seguridad del cliente (charla de acceso a planta).",
    ],
    controlesTrabajador: [
      "Cumplir estrictamente con la inducción y normativas internas de seguridad de la planta.",
      "Portar obligatoriamente el Equipo de Protección Personal (EPP) requerido (casco, botas, lentes, chaleco, protección auditiva).",
      "Transitar únicamente por los pasos peatonales autorizados.",
      "Prohibido terminantemente tocar maquinarias, válvulas o procesos industriales del cliente.",
    ],
  },
  {
    actividad: "Actividad 5: Traslados aéreos, marítimos o terrestres foráneos",
    tipoPeligro: "FÍSICO / DISERGONÓMICO",
    condicionInsegura: [
      "Traslados interurbanos en vehículo, lancha o avión comercial.",
      "Sedestación prolongada en butacas de transporte.",
      "Cinetosis (mareos por oleaje en lanchas/barcazas) o hipoxia relativa en vuelos.",
    ],
    efectosSalud: [
      "Cansancio extremo, pesadez en piernas, mareos, dolor lumbar.",
    ],
    probabilidad: "BAJA",
    severidad: "MEDIA",
    nivelRiesgo: "TOLERABLE",
    controlesFuente: ["Contratación de proveedores de transporte formalmente acreditados."],
    controlesMedio: [
      "Planificación de rutas seguras con paradas de descanso cada 2 horas en viajes terrestres.",
    ],
    controlesTrabajador: [
      "Uso permanente de cinturón de seguridad en todo vehículo terrestre o aéreo.",
      "Uso de chaleco salvavidas en transporte marítimo/fluvial.",
      "Movilización de tobillos y pies durante trayectos largos para activar circulación.",
    ],
  },
  {
    actividad: "Actividad 6: Respuesta y actuación ante emergencias en centro o cliente",
    tipoPeligro: "EMERGENCIA INTEGRAL",
    condicionInsegura: [
      "Conatos de incendio, sismos, fugas industriales o situaciones de desalojo masivo.",
      "Proyección de esquirlas, pánico colectivo o caídas en vías de escape.",
    ],
    efectosSalud: [
      "Lesiones traumáticas, quemaduras, inhalación de humo, asfixia.",
    ],
    probabilidad: "BAJA",
    severidad: "ALTA",
    nivelRiesgo: "MODERADO",
    controlesFuente: [
      "Dotación y mantenimiento de extintores vigentes y sistemas contra incendio.",
    ],
    controlesMedio: [
      "Rutas de escape demarcadas, alarmas operativas y brigadistas capacitados.",
    ],
    controlesTrabajador: [
      "Conservar la calma y orientar al grupo de participantes hacia la salida de emergencia.",
      "Seguir estrictamente las órdenes de la brigada de emergencias del centro o cliente.",
      "Reunirse en el punto de encuentro seguro y verificar que todos los alumnos hayan evacuado.",
    ],
  },
];

export const NOTIFICACION_RIESGOS_TEXT = {
  fechaLugar: "Lechería, Estado Anzoátegui, Venezuela",
  emisorNombre: "Rosa del Carmen Maestre Ruíz",
  emisorCedula: "V-14.012.938",
  emisorCargo: "Presidente de SHA DE VENEZUELA, C.A.",
  parrafos: [
    `Yo, Rosa del Carmen Maestre Ruíz, titular de la Cédula de Identidad N° V-14.012.938, actuando en mi carácter de Presidente de SHA DE VENEZUELA, C.A. y consciente de nuestros deberes y responsabilidades como empleador en materia de Seguridad y Salud en el Trabajo, según lo dispuesto en la Ley Orgánica de Prevención, Condiciones y Medio Ambiente de Trabajo (LOPCYMAT) y en concordancia con lo expresado en nuestra política de Seguridad y Salud en el Trabajo y compromisos de los objetivos propuestos, declaro que hemos identificado los procesos peligrosos y factores de riesgos inherentes y/o asociados a las actividades ejecutadas por los trabajadores y trabajadoras en cada uno de los puestos de trabajo, con el propósito de prevenir los accidentes de trabajo y/o enfermedades ocupacionales a través de la aplicación de principios de prevención y control, así como aleccionar a cada uno de los mismos.`,
    `En tal sentido, declaro que la empresa ha completado el proceso de identificación, evaluación y control de los riesgos derivados de los procesos peligrosos en los puestos de trabajo y en estricto apego a la LOPCYMAT a través de esta comunicación y en los Análisis de Riesgos y Procesos Peligrosos, cumple con comunicarle e informarle de forma verbal y por escrito, los riesgos identificados y evaluados en su lugar de trabajo, los agentes causantes, sus efectos probables a la salud, así como las recomendaciones necesarias que usted y la Empresa deben cumplir para prevenir y/o controlar los mismos, de manera de garantizar su salud e integridad física.`,
    `Su firma en este y los documentos anexos será considerada una señal de haber sido notificado por la empresa, según lo dispuesto en la LOPCYMAT en sus artículos 53 (numeral 1) y 56 (numerales 3 y 4), que establece el derecho de los trabajadores y trabajadoras a ser informados y el deber de los empleadores a informar por escrito a sus trabajadores y trabajadoras, así como el artículo 156 de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT), que indica que el trabajo se llevará a cabo en condiciones dignas y seguras, que permitan a los trabajadores y trabajadoras el desarrollo de sus potencialidades, capacidad creativa y pleno respeto a sus derechos humanos.`,
    `Agradecemos leer cuidadosamente esta comunicación y firmar en el sitio correspondiente en señal de que ha recibido verbalmente y comprendido por escrito la inducción de seguridad, los riesgos y procesos peligrosos asociados con el desempeño de su actividad laboral, las condiciones inseguras a las que probablemente estará expuesto por la acción de agentes Físicos, Químicos, Biológicos, Meteorológicos, Mecánicos, de Incendio y/o Explosión o a Condiciones Psicosociales y disergonómicas, que puedan causar daños a la salud.`,
  ],
  declaracionAceptacion:
    "Declaro que he recibido la inducción de seguridad, he leído y comprendido los riesgos notificados y me comprometo a cumplir con todas las normas de prevención de SHA de Venezuela, C.A.",
};

export const POLITICA_OPERATIVA_TEXT = {
  codigo: "POL-FAC-001",
  revision: "00",
  fecha: "29/09/2026",
  secciones: [
    {
      titulo: "1. Normas Generales de Conducta y Presentación",
      items: [
        "Cumplir estrictamente con el horario pactado.",
        "Presentarse en el centro de trabajo o locación del cliente con un mínimo de 30 minutos de anticipación para pruebas técnicas, alineación logística y validación de equipos.",
        "El Prestador de Servicios debe iniciar toda actividad identificándose formalmente a nombre de SHA DE VENEZUELA, C.A.",
        "Mantener una imagen profesional impecable, así como un lenguaje verbal y corporal acorde a un entorno corporativo de alto nivel.",
        "Queda estrictamente prohibido realizar acuerdos comerciales, personales o de servicios independientes con los clientes o participantes de SHA DE VENEZUELA, C.A. Cualquier solicitud adicional del cliente debe canalizarse a través de la Coordinación de la empresa.",
        "Cumplir de forma obligatoria con las normas de Seguridad y Salud en el Trabajo aplicables en el centro de trabajo donde se preste el servicio.",
        "Queda estrictamente prohibido ingerir o estar bajo los efectos del alcohol o sustancias psicotrópicas antes o durante la jornada laboral.",
        "Cuidar, mantener limpios y devolver en óptimas condiciones los equipos, herramientas y la locación asignada.",
      ],
    },
    {
      titulo: "2. Gestión Operativa y Entregables",
      items: [
        "Revisión del Material: Revisar de manera previa el material didáctico emitido por el Departamento de Capacitación.",
        "Notificación de Inicio/Cierre: Notificar vía llamada o WhatsApp al Coordinador de Capacitación a la llegada al cliente y al finalizar la jornada.",
        "Reportes y Plataforma PRISMA: Cargar el mismo día del evento en la plataforma PRISMA la lista de asistencia firmada y registrar las calificaciones correspondientes.",
        "Entregar en físico (oficina o Casillero ZOOM para zonas fuera de Anzoátegui) las evaluaciones originales corregidas y listas firmadas.",
        "Retornar el material didáctico original en un lapso no mayor a 24 horas tras la finalización del servicio.",
        "Ejecutar las actividades ajustadas al alcance contratado y recopilar solo la información estrictamente necesaria para los soportes técnicos.",
      ],
    },
    {
      titulo: "3. Registro Fotográfico y Publicación en Redes Sociales",
      items: [
        "Las imágenes tomadas durante el servicio son de uso exclusivo interno para verificar la ejecución del servicio ante el cliente y alimentar los informes o el SIG.",
        "Capacitación: Subir al sistema PRISMA el mismo día fotos del salón completo (visión general), presentación activa, desarrollo del curso y ejecución de prácticas.",
        "Servicios Técnicos: Las fotos deben documentar hallazgos o evidencias del servicio. Prohibición: Se prohíbe fotografiar maquinarias, instrumentos o procesos productivos del cliente, salvo necesidad crítica justificada para el informe.",
        "Ningún Prestador de Servicios ni empleado puede publicar fotografías o información del servicio en sus redes sociales personales o de su empresa sin autorización previa escrita del Cliente, gestionada a través de SHA DE VENEZUELA, C.A.",
        "En caso de ser aprobada la publicación, se debe etiquetar y nombrar obligatoriamente la cuenta oficial @SHA DE VENEZUELA, C.A.",
      ],
    },
    {
      titulo: "4. Acuerdo de Confidencialidad y Protección de Datos",
      items: [
        "El Prestador de Servicios se obliga a guardar absoluta reserva y confidencialidad respecto a toda la información técnica, comercial, operativa, financiera, metodológica o de procesos a la que tenga acceso de SHA DE VENEZUELA, C.A. o de sus Clientes.",
        "Todo el material didáctico, plantillas, informes y registros son propiedad exclusiva de SHA DE VENEZUELA, C.A. o del Cliente según corresponda. Se prohíbe su reproducción, divulgación o reutilización para fines ajenos al contrato.",
        "La obligación de confidencialidad se mantendrá vigente incluso tras la finalización del servicio contratado.",
      ],
    },
    {
      titulo: "5. Condiciones Administrativas",
      items: [
        "El Facilitador o Especialista Técnico deberá contar de manera obligatoria con un talonario de facturas fiscalmente legal y vigente (conforme a las normativas del SENIAT).",
      ],
    },
    {
      titulo: "6. Declaración y Aceptación",
      items: [
        "Declaro haber leído, comprendido y aceptado en su totalidad las disposiciones de esta POLÍTICA GENERAL DE ACTUACIÓN, CONFIDENCIALIDAD Y GESTIÓN OPERATIVA. Me comprometo a cumplir cada una de las normas aquí establecidas.",
      ],
    },
  ],
};
