"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Printer,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Car,
  Laptop,
  Plane,
  Plus,
  X,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import type {
  FacilitadorEntrevista,
  FacilitadorEntrevistaPayload,
  EntrevistaEstatus,
  ItemCumplimiento,
  UltimoCursoTiempo,
  ManejoHerramientasAudiovisuales,
  CaracteristicaEsencial,
} from "@/types/entrevistas-facilitadores";
import {
  DEFAULT_EVALUACION_ITEMS,
  ESTATUS_CONFIG,
} from "@/types/entrevistas-facilitadores";
import {
  saveEntrevista,
  promoverAFacilitador,
} from "@/app/actions/entrevistas-facilitadores";
import { useToast } from "@/lib/ui/toast-context";
import { EntrevistaPrintModal } from "./EntrevistaPrintModal";
import { toTitleCase } from "@/utils/string-utils";

interface EntrevistaFormClientProps {
  initialData?: FacilitadorEntrevista | null;
  mode: "nueva" | "editar";
  currentUserNombre?: string;
}

interface CourseTopic {
  id: number;
  nombre: string;
}

export function EntrevistaFormClient({
  initialData,
  mode,
  currentUserNombre = "",
}: EntrevistaFormClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");

  // Form State
  const [id, setId] = useState<number | undefined>(initialData?.id);
  const [nombreApellido, setNombreApellido] = useState(
    initialData?.nombre_apellido || ""
  );
  const [cedula, setCedula] = useState(initialData?.cedula || "");
  const [telefono, setTelefono] = useState(initialData?.telefono || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [direccion, setDireccion] = useState(initialData?.direccion || "");
  const [poseeVehiculo, setPoseeVehiculo] = useState(
    Boolean(initialData?.posee_vehiculo)
  );
  const [poseeLaptop, setPoseeLaptop] = useState(
    Boolean(initialData?.posee_laptop)
  );
  const [disponibilidadViajar, setDisponibilidadViajar] = useState(
    Boolean(initialData?.disponibilidad_viajar)
  );

  // Education
  const [nivelTecnico, setNivelTecnico] = useState(
    initialData?.nivel_tecnico || ""
  );
  const [universitario, setUniversitario] = useState(
    initialData?.universitario || ""
  );
  const [poseeEspecializacion, setPoseeEspecializacion] = useState(
    initialData?.posee_especializacion || ""
  );
  const [ultimoCursoTiempo, setUltimoCursoTiempo] = useState<
    UltimoCursoTiempo | ""
  >(initialData?.ultimo_curso_tiempo || "");
  const [ultimoCursoDescripcion, setUltimoCursoDescripcion] = useState(
    initialData?.ultimo_curso_descripcion || ""
  );
  const [
    manejoHerramientasAudiovisuales,
    setManejoHerramientasAudiovisuales,
  ] = useState<ManejoHerramientasAudiovisuales | "">(
    initialData?.manejo_herramientas_audiovisuales || ""
  );

  // Documentation Checklist
  const [docResumenCurricular, setDocResumenCurricular] = useState(
    Boolean(initialData?.doc_resumen_curricular)
  );
  const [docCedulaIdentidad, setDocCedulaIdentidad] = useState(
    Boolean(initialData?.doc_cedula_identidad)
  );
  const [
    docSoportesResumenCurricular,
    setDocSoportesResumenCurricular,
  ] = useState(Boolean(initialData?.doc_soportes_resumen_curricular));
  const [docRifActualizado, setDocRifActualizado] = useState(
    Boolean(initialData?.doc_rif_actualizado)
  );
  const [docRegistroInpsasel, setDocRegistroInpsasel] = useState(
    Boolean(initialData?.doc_registro_inpsasel)
  );
  const [docFacturaFiscal, setDocFacturaFiscal] = useState(
    Boolean(initialData?.doc_factura_fiscal)
  );
  const [docTituloUniversitario, setDocTituloUniversitario] = useState(
    Boolean(initialData?.doc_titulo_universitario)
  );
  const [docDeclaracionIslr, setDocDeclaracionIslr] = useState(
    Boolean(initialData?.doc_declaracion_islr)
  );
  const [docFormacionDocente, setDocFormacionDocente] = useState(
    Boolean(initialData?.doc_formacion_docente)
  );
  const [docPoseeLaptop, setDocPoseeLaptop] = useState(
    Boolean(initialData?.doc_posee_laptop)
  );

  // Experience Questions
  const [retosFacilitador, setRetosFacilitador] = useState(
    initialData?.retos_facilitador || ""
  );
  const [logrosFormacion, setLogrosFormacion] = useState(
    initialData?.logros_formacion || ""
  );
  const [caracteristicaEsencial, setCaracteristicaEsencial] = useState<
    CaracteristicaEsencial | ""
  >(
    (initialData?.caracteristica_esencial as CaracteristicaEsencial) || ""
  );
  const [ejemploLiderazgo, setEjemploLiderazgo] = useState(
    initialData?.ejemplo_liderazgo || ""
  );
  const [fortalezas, setFortalezas] = useState(initialData?.fortalezas || "");
  const [debilidades, setDebilidades] = useState(
    initialData?.debilidades || ""
  );
  const [motivoTrabajarAqui, setMotivoTrabajarAqui] = useState(
    initialData?.motivo_trabajar_aqui || ""
  );
  const [porQueContratarte, setPorQueContratarte] = useState(
    initialData?.por_que_contratarte || ""
  );
  const [temasCapacidades, setTemasCapacidades] = useState<string[]>(
    Array.isArray(initialData?.temas_capacidades)
      ? initialData.temas_capacidades
      : []
  );

  // Evaluation & Checklist
  const [fechaEntrevista, setFechaEntrevista] = useState(
    initialData?.fecha_entrevista ||
      new Date().toISOString().split("T")[0]
  );
  const [entrevistadoPor, setEntrevistadoPor] = useState(
    initialData?.entrevistado_por || currentUserNombre
  );
  const [observaciones, setObservaciones] = useState(
    initialData?.observaciones || ""
  );
  const [estatus, setEstatus] = useState<EntrevistaEstatus>(
    initialData?.estatus || "pendiente"
  );
  const [facilitadorId, setFacilitadorId] = useState<number | null>(
    initialData?.facilitador_id || null
  );

  // Evaluacion Items (6 items)
  const [evaluacionItems, setEvaluacionItems] = useState(
    initialData?.evaluacion_items && initialData.evaluacion_items.length > 0
      ? initialData.evaluacion_items
      : DEFAULT_EVALUACION_ITEMS.map((it) => ({
          ...it,
          cumplimiento: "" as unknown as ItemCumplimiento,
          observacion: "",
        }))
  );

  // Load Course Topics
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
    if (
      customTopicInput.trim() &&
      !temasCapacidades.includes(customTopicInput.trim())
    ) {
      setTemasCapacidades([...temasCapacidades, customTopicInput.trim()]);
      setCustomTopicInput("");
    }
  };

  const handleChecklistItemChange = (
    itemNro: number,
    cumplimiento: ItemCumplimiento,
    observacion?: string
  ) => {
    setEvaluacionItems((prev) =>
      prev.map((it) => {
        if (it.item_nro === itemNro) {
          return {
            ...it,
            cumplimiento,
            observacion:
              observacion !== undefined ? observacion : it.observacion,
          };
        }
        return it;
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreApellido.trim()) {
      addToast("El nombre y apellido del aspirante es obligatorio", "error");
      return;
    }

    setSaving(true);
    try {
      const payload: FacilitadorEntrevistaPayload = {
        ...(id ? { id } : {}),
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
          (manejoHerramientasAudiovisuales as ManejoHerramientasAudiovisuales) ||
          null,

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
        caracteristica_esencial: caracteristicaEsencial || null,
        ejemplo_liderazgo: ejemploLiderazgo.trim() || null,
        fortalezas: fortalezas.trim() || null,
        debilidades: debilidades.trim() || null,
        motivo_trabajar_aqui: motivoTrabajarAqui.trim() || null,
        por_que_contratarte: porQueContratarte.trim() || null,
        temas_capacidades: temasCapacidades,

        fecha_entrevista: fechaEntrevista,
        entrevistado_por: entrevistadoPor.trim() || null,
        evaluacion_items: evaluacionItems,
        observaciones: observaciones.trim() || null,
        estatus,
      };

      const res = await saveEntrevista(payload);
      if (res.error || !res.entrevista) {
        addToast(res.error || "Error al guardar la entrevista", "error");
        return;
      }

      addToast("Entrevista guardada exitosamente", "success");
      setId(res.entrevista.id);

      if (mode === "nueva") {
        router.push(
          `/dashboard/capacitacion/entrevista-facilitadores/${res.entrevista.id}`
        );
      }
    } catch {
      addToast("Error de conexión al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async () => {
    if (!id) {
      addToast("Primero guarda la entrevista antes de promover", "warning");
      return;
    }

    if (
      !confirm(
        `¿Deseas promover a ${toTitleCase(
          nombreApellido
        )} como facilitador activo en el sistema?`
      )
    ) {
      return;
    }

    setPromoting(true);
    try {
      const res = await promoverAFacilitador(id);
      if (!res.success) {
        addToast(res.error || "Error al promover", "error");
        return;
      }

      addToast("Aspirante promovido exitosamente a Facilitador", "success");
      setFacilitadorId(res.facilitadorId);
      setEstatus("aprobado");
    } catch {
      addToast("Error al promover a facilitador", "error");
    } finally {
      setPromoting(false);
    }
  };

  // Build temporary object for print modal
  const currentInterviewObject: FacilitadorEntrevista = {
    id: id || 0,
    nombre_apellido: nombreApellido,
    cedula,
    telefono,
    email,
    direccion,
    posee_vehiculo: poseeVehiculo,
    posee_laptop: poseeLaptop,
    disponibilidad_viajar: disponibilidadViajar,
    nivel_tecnico: nivelTecnico,
    universitario,
    posee_especializacion: poseeEspecializacion,
    ultimo_curso_tiempo: (ultimoCursoTiempo as UltimoCursoTiempo) || null,
    ultimo_curso_descripcion: ultimoCursoDescripcion,
    manejo_herramientas_audiovisuales:
      (manejoHerramientasAudiovisuales as ManejoHerramientasAudiovisuales) ||
      null,
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
    retos_facilitador: retosFacilitador,
    logros_formacion: logrosFormacion,
    caracteristica_esencial: caracteristicaEsencial || null,
    ejemplo_liderazgo: ejemploLiderazgo,
    fortalezas,
    debilidades,
    motivo_trabajar_aqui: motivoTrabajarAqui,
    por_que_contratarte: porQueContratarte,
    temas_capacidades: temasCapacidades,
    fecha_entrevista: fechaEntrevista,
    entrevistado_por: entrevistadoPor,
    evaluacion_items: evaluacionItems,
    observaciones,
    estatus,
    facilitador_id: facilitadorId,
    promovido_at: initialData?.promovido_at || null,
    creado_por: initialData?.creado_por || null,
    created_at: initialData?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Top Header & Actions */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/capacitacion/entrevista-facilitadores"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Entrevistas
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "nueva"
                ? "Nueva Entrevista de Facilitador"
                : `Entrevista: ${toTitleCase(nombreApellido || "Aspirante")}`}
            </h1>
            {id && (
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  estatus === "aprobado"
                    ? "bg-emerald-100 text-emerald-800"
                    : estatus === "rechazado"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {estatus}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Formato oficial de entrevista para aspirantes y facilitadores
            (Z:\Alex\Formato de entrevista facilitador.xlsx)
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            Imprimir Formato
          </button>

          {id && !facilitadorId && estatus === "aprobado" && (
            <button
              type="button"
              onClick={handlePromote}
              disabled={promoting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {promoting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              Promover a Facilitador
            </button>
          )}

          {facilitadorId && (
            <Link
              href={`/dashboard/capacitacion/gestion-de-facilitadores?edit=${facilitadorId}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
            >
              <UserCheck className="w-4 h-4" />
              Ver Facilitador #{facilitadorId}
              <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECCIÓN 1: DATOS DEL ASPIRANTE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Datos del Aspirante
            </h2>
            <span className="text-xs text-gray-400">Campos obligatorios *</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                value={nombreApellido}
                onChange={(e) => setNombreApellido(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                C.I. Nro
              </label>
              <input
                type="text"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Ej. V-12345678"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 0414-1234567"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. aspirante@gmail.com"
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Dirección
              </label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ciudad, Estado, Dirección de habitación..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-700 uppercase">
                  Posee Vehículo
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPoseeVehiculo(true)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    poseeVehiculo
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  SI
                </button>
                <button
                  type="button"
                  onClick={() => setPoseeVehiculo(false)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    !poseeVehiculo
                      ? "bg-rose-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-700 uppercase">
                  Posee Laptop
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPoseeLaptop(true)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    poseeLaptop
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  SI
                </button>
                <button
                  type="button"
                  onClick={() => setPoseeLaptop(false)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    !poseeLaptop
                      ? "bg-rose-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-bold text-gray-700 uppercase">
                  Disponibilidad de Viajar
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDisponibilidadViajar(true)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    disponibilidadViajar
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  SI
                </button>
                <button
                  type="button"
                  onClick={() => setDisponibilidadViajar(false)}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    !disponibilidadViajar
                      ? "bg-rose-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: 1. NIVEL EDUCATIVO */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              1. Nivel Educativo (Describa el área al cual aplique)
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nivel Técnico
              </label>
              <input
                type="text"
                value={nivelTecnico}
                onChange={(e) => setNivelTecnico(e.target.value)}
                placeholder="Área técnica o especialidad..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Universitario
              </label>
              <input
                type="text"
                value={universitario}
                onChange={(e) => setUniversitario(e.target.value)}
                placeholder="Carrera, universidad, título obtenido..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Posee Especialización (Detalle)
              </label>
              <input
                type="text"
                value={poseeEspecializacion}
                onChange={(e) => setPoseeEspecializacion(e.target.value)}
                placeholder="Especializaciones, postgrados, diplomados..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
              <label className="block text-xs font-bold text-gray-800 uppercase">
                ¿Cuándo realizó su último curso, taller, seminario o
                actualización sobre el área que se desenvuelve como facilitador?
                (Que tenga soporte formal y físico del mismo)
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { value: "6_meses", label: "6 Meses" },
                  { value: "12_meses", label: "12 Meses" },
                  { value: "mas_12_meses", label: "+ de 12 Meses" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setUltimoCursoTiempo(
                        ultimoCursoTiempo === opt.value
                          ? ""
                          : (opt.value as UltimoCursoTiempo)
                      )
                    }
                    className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      ultimoCursoTiempo === opt.value
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    ( {ultimoCursoTiempo === opt.value ? "X" : " "} ){" "}
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Describa:
                </label>
                <textarea
                  rows={2}
                  value={ultimoCursoDescripcion}
                  onChange={(e) => setUltimoCursoDescripcion(e.target.value)}
                  placeholder="Nombre de la actualización, institución o tema..."
                  className="w-full text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
              <label className="block text-xs font-bold text-gray-800 uppercase">
                ¿Cómo considera que maneja las herramientas audiovisuales que
                forman parte de una capacitación (laptop, video beam, cornetas,
                teléfono, entre otros)?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { value: "totalmente", label: "Totalmente" },
                  { value: "con_limitacion", label: "Con Limitación" },
                  { value: "en_aprendizaje", label: "En Aprendizaje" },
                  { value: "no_se_manejarlos", label: "No sé manejarlos" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setManejoHerramientasAudiovisuales(
                        manejoHerramientasAudiovisuales === opt.value
                          ? ""
                          : (opt.value as ManejoHerramientasAudiovisuales)
                      )
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                      manejoHerramientasAudiovisuales === opt.value
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    ( {manejoHerramientasAudiovisuales === opt.value ? "X" : " "} ){" "}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: DOCUMENTACIÓN LEGAL VIGENTE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Marque la Documentación Legal Vigente con la que cuente de manera
              digital y física / Soportes
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-violet-100 text-violet-800 rounded-full">
              {[
                docResumenCurricular,
                docCedulaIdentidad,
                docSoportesResumenCurricular,
                docRifActualizado,
                docRegistroInpsasel,
                docFacturaFiscal,
                docTituloUniversitario,
                docDeclaracionIslr,
                docFormacionDocente,
                docPoseeLaptop,
              ].filter(Boolean).length}{" "}
              de 10 seleccionados
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: "resumen",
                label: "Resumen Curricular",
                checked: docResumenCurricular,
                onChange: setDocResumenCurricular,
              },
              {
                id: "cedula",
                label: "Cédula de Identidad",
                checked: docCedulaIdentidad,
                onChange: setDocCedulaIdentidad,
              },
              {
                id: "soportes",
                label: "Soportes de Resumen Curricular",
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
                label: "Factura Fiscal",
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
                label: "Posee Formación Docente Certificada",
                checked: docFormacionDocente,
                onChange: setDocFormacionDocente,
              },
              {
                id: "laptop",
                label: "Posee Laptop",
                checked: docPoseeLaptop,
                onChange: setDocPoseeLaptop,
              },
            ].map((doc) => (
              <div
                key={doc.id}
                onClick={() => doc.onChange(!doc.checked)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  doc.checked
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="text-xs font-semibold uppercase">
                  {doc.label}
                </span>
                <div className="flex items-center gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                      doc.checked
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    SI
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                      !doc.checked
                        ? "bg-rose-600 text-white"
                        : "bg-gray-200 text-gray-600"
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                4
              </span>
              Preguntas de Desenvolvimiento y Competencias
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nombre al menos 2 retos que ha tenido que enfrentar como facilitador
              </label>
              <textarea
                rows={3}
                value={retosFacilitador}
                onChange={(e) => setRetosFacilitador(e.target.value)}
                placeholder="Describa los retos..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nombre al menos 2 logros que ha alcanzado en alguna actividad de formación
              </label>
              <textarea
                rows={3}
                value={logrosFormacion}
                onChange={(e) => setLogrosFormacion(e.target.value)}
                placeholder="Describa los logros..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-2">
            <label className="block text-xs font-bold text-gray-800 uppercase">
              ¿Cuál de las siguientes características es esencial para un
              facilitador que trabaja con público objetivo heterogéneos?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: "empatia", label: "a) Empatía" },
                { value: "introversion", label: "b) Introversión" },
                { value: "autoritarismo", label: "c) Autoritarismo" },
                { value: "indiferencia", label: "d) Indiferencia" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setCaracteristicaEsencial(
                      caracteristicaEsencial === opt.value
                        ? ""
                        : (opt.value as CaracteristicaEsencial)
                    )
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    caracteristicaEsencial === opt.value
                      ? "bg-violet-600 text-white border-violet-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Da un ejemplo de cuándo has podido usar tus habilidades de liderazgo
            </label>
            <textarea
              rows={2}
              value={ejemploLiderazgo}
              onChange={(e) => setEjemploLiderazgo(e.target.value)}
              placeholder="Ejemplo de liderazgo..."
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Lista 5 Fortalezas
              </label>
              <textarea
                rows={3}
                value={fortalezas}
                onChange={(e) => setFortalezas(e.target.value)}
                placeholder="1. ...&#10;2. ...&#10;3. ..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Lista 5 Debilidades
              </label>
              <textarea
                rows={3}
                value={debilidades}
                onChange={(e) => setDebilidades(e.target.value)}
                placeholder="1. ...&#10;2. ...&#10;3. ..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                ¿Por qué quieres trabajar aquí?
              </label>
              <textarea
                rows={2}
                value={motivoTrabajarAqui}
                onChange={(e) => setMotivoTrabajarAqui(e.target.value)}
                placeholder="Motivaciones..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                ¿Por qué debemos contratarte?
              </label>
              <textarea
                rows={2}
                value={porQueContratarte}
                onChange={(e) => setPorQueContratarte(e.target.value)}
                placeholder="Argumentos clave..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Temas a impartir */}
          <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 space-y-3">
            <label className="block text-xs font-bold text-gray-800 uppercase">
              Cuáles temas consideras tener las capacidades para impartir:
            </label>

            {/* Custom topic input */}
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
                className="flex-1 text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTopic}
                className="inline-flex items-center gap-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            {/* Selected topics */}
            {temasCapacidades.length > 0 && (
              <div>
                <span className="text-xs text-gray-500 block mb-1">
                  Temas seleccionados ({temasCapacidades.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {temasCapacidades.map((tema) => (
                    <span
                      key={tema}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 text-violet-800 rounded-lg text-xs font-medium"
                    >
                      {tema}
                      <button
                        type="button"
                        onClick={() => handleToggleTopic(tema)}
                        className="text-violet-600 hover:text-violet-900"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Catalog suggestions */}
            {courseTopics.length > 0 && (
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    Catálogo de capacitación:
                  </span>
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filtrar cursos de capacitación..."
                    className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1.5 bg-white border border-gray-200 rounded-lg">
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
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
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

        {/* SECCIÓN 5: EVALUACIÓN DE LA ENTREVISTA */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                5
              </span>
              Evaluación de la Entrevista (Checklist de 6 Puntos)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Fecha de Entrevista
              </label>
              <input
                type="date"
                required
                value={fechaEntrevista}
                onChange={(e) => setFechaEntrevista(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Entrevistado Por:
              </label>
              <input
                type="text"
                value={entrevistadoPor}
                onChange={(e) => setEntrevistadoPor(e.target.value)}
                placeholder="Nombre del entrevistador..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Table for the 6 checklist items */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="p-2.5 w-10 text-center">N°</th>
                  <th className="p-2.5 text-left">Criterio</th>
                  <th className="p-2.5 w-72 text-center">Cumplimiento</th>
                  <th className="p-2.5 text-left">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {evaluacionItems.map((it) => (
                  <tr key={it.item_nro} className="hover:bg-gray-50/50">
                    <td className="p-2.5 text-center font-bold text-gray-500">
                      {it.item_nro}
                    </td>
                    <td className="p-2.5 font-medium text-gray-800">
                      {it.criterio}
                    </td>
                    <td className="p-2.5">
                      <div className="flex gap-1 justify-center">
                        {[
                          { val: "cumple", label: "Cumple", color: "emerald" },
                          {
                            val: "cumple_parcial",
                            label: "Parcial",
                            color: "amber",
                          },
                          {
                            val: "no_cumple",
                            label: "No Cumple",
                            color: "rose",
                          },
                        ].map((btn) => (
                          <button
                            key={btn.val}
                            type="button"
                            onClick={() =>
                              handleChecklistItemChange(
                                it.item_nro,
                                btn.val as ItemCumplimiento
                              )
                            }
                            className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                              it.cumplimiento === btn.val
                                ? btn.color === "emerald"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : btn.color === "amber"
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-rose-600 text-white border-rose-600"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={it.observacion}
                        onChange={(e) =>
                          handleChecklistItemChange(
                            it.item_nro,
                            it.cumplimiento,
                            e.target.value
                          )
                        }
                        placeholder="Nota u observación..."
                        className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
              Observaciones Generales
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Comentarios finales del entrevistador, fortalezas observadas, condiciones o acuerdos..."
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Status Selection */}
          <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-gray-700 uppercase block mb-1">
                Estatus Final de la Entrevista:
              </span>
              <div className="flex gap-2">
                {(["pendiente", "aprobado", "rechazado"] as EntrevistaEstatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEstatus(st)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                        estatus === st
                          ? st === "aprobado"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : st === "rechazado"
                            ? "bg-rose-600 text-white border-rose-600"
                            : "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar Entrevista
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Print Modal */}
      <EntrevistaPrintModal
        entrevista={currentInterviewObject}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
}
