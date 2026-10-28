"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Car,
  Laptop,
  Plane,
  Send,
  Plus,
  X,
  FileText,
  GraduationCap,
  Sparkles,
  User,
  ShieldCheck,
} from "lucide-react";
import type {
  UltimoCursoTiempo,
  ManejoHerramientasAudiovisuales,
  CaracteristicaEsencial,
  CandidatoPostulacionPayload,
} from "@/types/entrevistas-facilitadores";
import { submitCandidatoPostulacion } from "@/app/actions/entrevistas-facilitadores";
import { normalizeCedula, normalizePhoneNumber } from "@/utils/string-utils";

interface PostulacionFormClientProps {
  token: string;
  nombreInicial?: string;
  emailInicial?: string;
  tituloCampana?: string | null;
}

interface CourseTopic {
  id: number;
  nombre: string;
}

export function PostulacionFormClient({
  token,
  nombreInicial = "",
  emailInicial = "",
  tituloCampana = null,
}: PostulacionFormClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Honeypot field (anti-spam bot trap)
  const [hpWebsite, setHpWebsite] = useState("");

  // Course topics catalog
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [customTopicInput, setCustomTopicInput] = useState("");

  // 1. Datos del aspirante
  const [nombreApellido, setNombreApellido] = useState(nombreInicial);
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState(emailInicial);
  const [direccion, setDireccion] = useState("");
  const [poseeVehiculo, setPoseeVehiculo] = useState(false);
  const [poseeLaptop, setPoseeLaptop] = useState(false);
  const [disponibilidadViajar, setDisponibilidadViajar] = useState(false);

  // 2. Nivel Educativo
  const [nivelTecnico, setNivelTecnico] = useState("");
  const [universitario, setUniversitario] = useState("");
  const [poseeEspecializacion, setPoseeEspecializacion] = useState("");
  const [ultimoCursoTiempo, setUltimoCursoTiempo] = useState<UltimoCursoTiempo | "">("");
  const [ultimoCursoDescripcion, setUltimoCursoDescripcion] = useState("");
  const [manejoHerramientasAudiovisuales, setManejoHerramientasAudiovisuales] = useState<
    ManejoHerramientasAudiovisuales | ""
  >("");

  // 3. Documentación Vigente
  const [docResumenCurricular, setDocResumenCurricular] = useState(false);
  const [docCedulaIdentidad, setDocCedulaIdentidad] = useState(false);
  const [docSoportesResumenCurricular, setDocSoportesResumenCurricular] = useState(false);
  const [docRifActualizado, setDocRifActualizado] = useState(false);
  const [docRegistroInpsasel, setDocRegistroInpsasel] = useState(false);
  const [docFacturaFiscal, setDocFacturaFiscal] = useState(false);
  const [docTituloUniversitario, setDocTituloUniversitario] = useState(false);
  const [docDeclaracionIslr, setDocDeclaracionIslr] = useState(false);
  const [docFormacionDocente, setDocFormacionDocente] = useState(false);
  const [docPoseeLaptop, setDocPoseeLaptop] = useState(false);

  // 4. Desenvolvimiento y Competencias
  const [retosFacilitador, setRetosFacilitador] = useState("");
  const [logrosFormacion, setLogrosFormacion] = useState("");
  const [caracteristicaEsencial, setCaracteristicaEsencial] = useState<CaracteristicaEsencial | "">("");
  const [ejemploLiderazgo, setEjemploLiderazgo] = useState("");
  const [fortalezas, setFortalezas] = useState("");
  const [debilidades, setDebilidades] = useState("");
  const [motivoTrabajarAqui, setMotivoTrabajarAqui] = useState("");
  const [porQueContratarte, setPorQueContratarte] = useState("");
  const [temasCapacidades, setTemasCapacidades] = useState<string[]>([]);

  useEffect(() => {
    async function loadTopics() {
      try {
        const res = await fetch("/api/course-topics");
        if (res.ok) {
          const data = await res.json();
          setCourseTopics(data || []);
        }
      } catch (err) {
        console.error("Error loading course topics:", err);
      }
    }
    loadTopics();
  }, []);

  const handleToggleTopic = (topicName: string) => {
    if (temasCapacidades.includes(topicName)) {
      setTemasCapacidades(temasCapacidades.filter((t) => t !== topicName));
    } else {
      setTemasCapacidades([...temasCapacidades, topicName]);
    }
  };

  const handleAddCustomTopic = () => {
    const val = customTopicInput.trim();
    if (val && !temasCapacidades.includes(val)) {
      setTemasCapacidades([...temasCapacidades, val]);
      setCustomTopicInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombreApellido.trim()) {
      setErrorMsg("El nombre y apellido es un campo obligatorio.");
      return;
    }

    if (!cedula.trim()) {
      setErrorMsg("La cédula de identidad es obligatoria.");
      return;
    }

    if (!telefono.trim() && !email.trim()) {
      setErrorMsg("Debes ingresar al menos un teléfono de contacto o correo electrónico.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CandidatoPostulacionPayload = {
        token,
        nombre_apellido: nombreApellido.trim(),
        cedula: cedula.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        posee_vehiculo: poseeVehiculo,
        posee_laptop: poseeLaptop,
        disponibilidad_viajar: disponibilidadViajar,

        nivel_tecnico: nivelTecnico.trim() || null,
        universitario: universitario.trim() || null,
        posee_especializacion: poseeEspecializacion.trim() || null,
        ultimo_curso_tiempo: (ultimoCursoTiempo as UltimoCursoTiempo) || null,
        ultimo_curso_descripcion: ultimoCursoDescripcion.trim() || null,
        manejo_herramientas_audiovisuales:
          (manejoHerramientasAudiovisuales as ManejoHerramientasAudiovisuales) || null,

        doc_resumen_curricular: docResumenCurricular,
        doc_cedula_identidad: docCedulaIdentidad,
        doc_soportes_resumen_curricular: docSoportesResumenCurricular,
        doc_rif_actualizado: docRifActualizado,
        doc_registro_inpsasel: docRegistroInpsasel,
        doc_factura_fiscal: docFacturaFiscal,
        doc_titulo_universitario: docTituloUniversitario,
        doc_declaracion_islr: docDeclaracionIslr,
        doc_formacion_docente: docFormacionDocente,
        doc_posee_laptop: docPoseeLaptop,

        retos_facilitador: retosFacilitador.trim() || null,
        logros_formacion: logrosFormacion.trim() || null,
        caracteristica_esencial: (caracteristicaEsencial as CaracteristicaEsencial) || null,
        ejemplo_liderazgo: ejemploLiderazgo.trim() || null,
        fortalezas: fortalezas.trim() || null,
        debilidades: debilidades.trim() || null,
        motivo_trabajar_aqui: motivoTrabajarAqui.trim() || null,
        por_que_contratarte: porQueContratarte.trim() || null,
        temas_capacidades: temasCapacidades,

        _hp_website: hpWebsite,
      };

      const res = await submitCandidatoPostulacion(payload);
      if (!res.success) {
        setErrorMsg(res.error || "Ocurrió un error al enviar el formulario. Intenta nuevamente.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Error submitting postulación:", err);
      setErrorMsg("Error de conexión con el servidor. Por favor verifica tu conexión a internet.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={160}
            height={50}
            priority
            className="h-auto w-auto"
          />
        </div>

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            ¡Postulación Enviada con Éxito!
          </h1>
          <p className="text-base text-slate-600 leading-relaxed max-w-lg mx-auto">
            Hemos recibido tus datos y perfil profesional correctamente. El equipo de Capacitación de{" "}
            <span className="font-semibold text-slate-800">SHA de Venezuela</span> revisará tu información y se pondrá en contacto contigo para coordinar los siguientes pasos del proceso.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-100 bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700">Departamento de Capacitación</p>
          <p>SHA de Venezuela, C.A. — Seguridad, Higiene y Ambiente</p>
          <p className="text-slate-400">Gracias por tu interés en formar parte de nuestro equipo de facilitadores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <Image
            src="/logo.png"
            alt="SHA de Venezuela"
            width={160}
            height={50}
            priority
            className="h-auto w-auto"
          />
          <div className="text-center sm:text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {tituloCampana ? "Convocatoria Abierta" : "Convocatoria Oficial"}
            </span>
            <p className="text-xs text-slate-500">Formato de Selección de Facilitadores</p>
          </div>
        </div>

        <div className="pt-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {tituloCampana
              ? `Postulación: ${tituloCampana}`
              : "Formulario de Postulación de Facilitador"}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {tituloCampana
              ? `Bienvenido a la convocatoria oficial de facilitadores de SHA de Venezuela. Completa tus datos para postularte a esta oportunidad.`
              : "Por favor completa las siguientes secciones con información veraz y actualizada sobre tu formación académica, experiencia técnica y competencias como facilitador."}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <div className="text-sm">
            <p className="font-semibold">Atención:</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Anti-spam honeypot (invisible to humans) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website_input">Website</label>
          <input
            id="website_input"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hpWebsite}
            onChange={(e) => setHpWebsite(e.target.value)}
          />
        </div>

        {/* SECCIÓN 1: DATOS DEL ASPIRANTE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-violet-600" />
                Datos Personales y de Contacto
              </h2>
            </div>
            <span className="text-xs text-slate-400">* Campos obligatorios</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                value={nombreApellido}
                onChange={(e) => setNombreApellido(e.target.value)}
                placeholder="Ej. Juan Carlos Pérez"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Cédula de Identidad *
              </label>
              <div className="flex gap-2">
                <select
                  value={cedula.toUpperCase().startsWith("E") ? "E" : "V"}
                  onChange={(e) => {
                    const type = e.target.value;
                    const digits = cedula.replace(/\D/g, "");
                    setCedula(digits ? `${type}-${digits}` : `${type}-`);
                  }}
                  className="w-20 text-sm px-2.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  <option value="V">V-</option>
                  <option value="E">E-</option>
                </select>
                <input
                  type="text"
                  required
                  value={cedula.replace(/^[vVeE]-?/, "")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    const type = cedula.toUpperCase().startsWith("E") ? "E" : "V";
                    setCedula(digits ? `${type}-${digits}` : "");
                  }}
                  onBlur={() => setCedula(normalizeCedula(cedula))}
                  placeholder="12345678"
                  className="flex-1 text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Teléfono de Contacto (Móvil / WhatsApp) *
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value.replace(/\D/g, ""))}
                onBlur={(e) => setTelefono(normalizePhoneNumber(e.target.value))}
                placeholder="Ej. 04141234567"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. aspirante@gmail.com"
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Dirección de Habitación (Ciudad, Estado)
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej. Valencia, Edo. Carabobo..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700 uppercase">Posee Vehículo</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPoseeVehiculo(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    poseeVehiculo
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setPoseeVehiculo(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    !poseeVehiculo
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700 uppercase">Posee Laptop</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPoseeLaptop(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    poseeLaptop
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setPoseeLaptop(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    !poseeLaptop
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-700 uppercase">Disponibilidad de Viajar</span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDisponibilidadViajar(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    disponibilidadViajar
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  SÍ
                </button>
                <button
                  type="button"
                  onClick={() => setDisponibilidadViajar(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    !disponibilidadViajar
                      ? "bg-rose-600 text-white shadow-sm"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: NIVEL EDUCATIVO Y ACTUALIZACIÓN */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-violet-600" />
              Nivel Educativo y Actualización Profesional
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Nivel Técnico (Área o Especialidad)
              </label>
              <input
                type="text"
                value={nivelTecnico}
                onChange={(e) => setNivelTecnico(e.target.value)}
                placeholder="Ej. TSU en Seguridad Industrial / TSU Mecánica..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Nivel Universitario (Carrera, Universidad, Título)
              </label>
              <input
                type="text"
                value={universitario}
                onChange={(e) => setUniversitario(e.target.value)}
                placeholder="Ej. Ingeniero Industrial (Universidad de Carabobo)..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Posee Especialización / Postgrado (Detalles)
              </label>
              <input
                type="text"
                value={poseeEspecializacion}
                onChange={(e) => setPoseeEspecializacion(e.target.value)}
                placeholder="Ej. Especialista en Ergonomía Laboral / Gerencia Ambiental..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  ¿Cuándo realizó su última actividad de capacitación o actualización?
                </label>
                <select
                  value={ultimoCursoTiempo}
                  onChange={(e) => setUltimoCursoTiempo(e.target.value as UltimoCursoTiempo)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  <option value="">Selecciona un período...</option>
                  <option value="6_meses">En los últimos 6 meses</option>
                  <option value="12_meses">En los últimos 12 meses</option>
                  <option value="mas_12_meses">Hace más de 12 meses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Manejo de herramientas audiovisuales (proyector, plataformas, slides)
                </label>
                <select
                  value={manejoHerramientasAudiovisuales}
                  onChange={(e) =>
                    setManejoHerramientasAudiovisuales(
                      e.target.value as ManejoHerramientasAudiovisuales
                    )
                  }
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  <option value="">Selecciona tu nivel...</option>
                  <option value="totalmente">Totalmente competente y fluido</option>
                  <option value="con_limitacion">Con alguna limitación menor</option>
                  <option value="en_aprendizaje">En fase de aprendizaje</option>
                  <option value="no_se_manejarlos">No tengo experiencia previa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Breve descripción de su último curso o actualización realizada
              </label>
              <textarea
                rows={2}
                value={ultimoCursoDescripcion}
                onChange={(e) => setUltimoCursoDescripcion(e.target.value)}
                placeholder="Nombre del curso, institución y fecha aproximada..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: DOCUMENTACIÓN VIGENTE Y SOPORTES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600" />
                Documentación Vigente y Recaudos
              </h2>
            </div>
            <span className="text-xs text-slate-500">Marca los que posees disponibles actualmente</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: "cv",
                label: "Resumen Curricular Actualizado",
                checked: docResumenCurricular,
                onChange: setDocResumenCurricular,
              },
              {
                id: "ci",
                label: "Cédula de Identidad Vigente",
                checked: docCedulaIdentidad,
                onChange: setDocCedulaIdentidad,
              },
              {
                id: "soportes",
                label: "Soportes y Certificaciones del CV",
                checked: docSoportesResumenCurricular,
                onChange: setDocSoportesResumenCurricular,
              },
              {
                id: "rif",
                label: "RIF Actualizado",
                checked: docRifActualizado,
                onChange: setDocRifActualizado,
              },
              {
                id: "inpsasel",
                label: "Registro ante el INPSASEL",
                checked: docRegistroInpsasel,
                onChange: setDocRegistroInpsasel,
              },
              {
                id: "factura",
                label: "Factura Fiscal Personal o Jurídica",
                checked: docFacturaFiscal,
                onChange: setDocFacturaFiscal,
              },
              {
                id: "titulo",
                label: "Título Universitario o Fondo Negro",
                checked: docTituloUniversitario,
                onChange: setDocTituloUniversitario,
              },
              {
                id: "islr",
                label: "Última Declaración de ISLR",
                checked: docDeclaracionIslr,
                onChange: setDocDeclaracionIslr,
              },
              {
                id: "docente",
                label: "Formación Docente Certificada (Pedagógica)",
                checked: docFormacionDocente,
                onChange: setDocFormacionDocente,
              },
              {
                id: "laptop_rec",
                label: "Laptop propia para uso en clases",
                checked: docPoseeLaptop,
                onChange: setDocPoseeLaptop,
              },
            ].map((doc) => (
              <div
                key={doc.id}
                onClick={() => doc.onChange(!doc.checked)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                  doc.checked
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="text-xs font-semibold uppercase">{doc.label}</span>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-colors ${
                      doc.checked ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    SÍ
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-bold transition-colors ${
                      !doc.checked ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    NO
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN 4: DESENVOLVIMIENTO Y COMPETENCIAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Desenvolvimiento y Competencias del Facilitador
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Nombra al menos 2 retos que has tenido que enfrentar como facilitador
              </label>
              <textarea
                rows={3}
                value={retosFacilitador}
                onChange={(e) => setRetosFacilitador(e.target.value)}
                placeholder="Describe los desafíos que has afrontado y cómo los resolviste..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Nombra al menos 2 logros que has alcanzado en actividades de formación
              </label>
              <textarea
                rows={3}
                value={logrosFormacion}
                onChange={(e) => setLogrosFormacion(e.target.value)}
                placeholder="Describe tus mayores logros o impactos con participantes..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              ¿Cuál considera que es la característica más esencial de un facilitador?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "empatia", label: "Empatía" },
                { value: "introversion", label: "Introversión" },
                { value: "autoritarismo", label: "Autoritarismo" },
                { value: "indiferencia", label: "Indiferencia" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setCaracteristicaEsencial(opt.value as CaracteristicaEsencial)
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                    caracteristicaEsencial === opt.value
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                Indica un ejemplo donde hayas tenido que demostrar liderazgo
              </label>
              <textarea
                rows={2}
                value={ejemploLiderazgo}
                onChange={(e) => setEjemploLiderazgo(e.target.value)}
                placeholder="Situación en aula, equipo o empresa..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ¿Cuáles son tus mayores fortalezas como facilitador?
              </label>
              <textarea
                rows={2}
                value={fortalezas}
                onChange={(e) => setFortalezas(e.target.value)}
                placeholder="Dominio técnico, dicción, dinamismo, pedagogía..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ¿Cuáles consideras tus debilidades o áreas a mejorar?
              </label>
              <textarea
                rows={2}
                value={debilidades}
                onChange={(e) => setDebilidades(e.target.value)}
                placeholder="Aspectos en los que buscas seguir perfeccionándote..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ¿Cuál es tu principal motivo para querer colaborar con SHA de Venezuela?
              </label>
              <textarea
                rows={2}
                value={motivoTrabajarAqui}
                onChange={(e) => setMotivoTrabajarAqui(e.target.value)}
                placeholder="Describe tu motivación..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ¿Por qué consideras que deberíamos seleccionarte como parte de nuestro equipo?
              </label>
              <textarea
                rows={2}
                value={porQueContratarte}
                onChange={(e) => setPorQueContratarte(e.target.value)}
                placeholder="Tu valor agregado diferencial como facilitador..."
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
              />
            </div>
          </div>

          {/* Temas y Capacidades */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Temas y Cursos que puedes facilitar con solvencia
            </label>

            {/* Custom topic addition */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTopic();
                  }
                }}
                placeholder="Escribe un tema o selecciona del catálogo..."
                className="flex-1 text-sm px-3.5 py-2 bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTopic}
                className="inline-flex items-center gap-1 px-4 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            {/* Selected topics list */}
            {temasCapacidades.length > 0 && (
              <div>
                <span className="text-xs text-slate-500 block mb-1.5">
                  Temas seleccionados ({temasCapacidades.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {temasCapacidades.map((tema) => (
                    <span
                      key={tema}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-100 text-violet-800 rounded-lg text-xs font-semibold"
                    >
                      {tema}
                      <button
                        type="button"
                        onClick={() => handleToggleTopic(tema)}
                        className="text-violet-600 hover:text-violet-900 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog list */}
            {courseTopics.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Cursos del catálogo de SHA (haz clic para agregar):
                  </span>
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filtrar cursos..."
                    className="text-xs px-3 py-1 bg-slate-50 border border-slate-300 rounded-lg w-full sm:w-64 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/70 border border-slate-200 rounded-xl">
                  {courseTopics
                    .filter((topic) =>
                      topic.nombre
                        .toLowerCase()
                        .includes(catalogSearch.toLowerCase().trim())
                    )
                    .map((topic) => {
                      const isSelected = temasCapacidades.includes(topic.nombre);
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleToggleTopic(topic.nombre)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {topic.nombre}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 max-w-md text-center sm:text-left">
            Al hacer clic en <span className="font-semibold text-slate-700">&quot;Enviar Postulación&quot;</span>, confirmas que los datos ingresados son fidedignos y autorizas a SHA de Venezuela al tratamiento de tu perfil para fines de selección.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando postulación...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Postulación
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
