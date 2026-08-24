"use client";

import { useState, useEffect, useMemo, Suspense, useRef, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { RequisicionFormData, OSIFullData, RequisicionItem, OSIFixedItem, OSISesion } from "@/types/requisiciones";
import { Button } from "@/components/ui/button";
import {
  getOSIForRequisicion,
  createRequisicionRecord,
  updateRequisicionRecord,
  getRequisicionRecord,
  getFacilitatorsForDropdown,
} from "@/app/actions/requisiciones";
import { mapGerenciaSolicitante } from "@/lib/requisiciones-gerencia";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function RequisicionForm({
  osis = [],
  facilitators = [],
  userData = null,
  editRecord = null,
  userDept = "",
  userGerencia = "",
  isLocked = false,
  lockReason = "",
  banks = [],
  osiSessions = [],
  canPlaceInterna = true,
  isLider = false,
}: {
  osis?: OSIFullData[],
  facilitators?: any[],
  userData?: any,
  editRecord?: any,
  userDept?: string,
  userGerencia?: string,
  isLocked?: boolean,
  lockReason?: string,
  banks?: { id: number; nombre: string }[],
  osiSessions?: { id: number; id_osi: number; nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[],
  canPlaceInterna?: boolean,
  isLider?: boolean,
}) {
  return (
    <Suspense fallback={<div>Cargando formulario...</div>}>
      <RequisicionFormContent
        initialOsis={osis}
        initialFacilitators={facilitators}
        initialUserData={userData}
        editRecord={editRecord}
        userDept={userDept}
        userGerencia={userGerencia}
        isLocked={isLocked}
        lockReason={lockReason}
        banks={banks}
        osiSessions={osiSessions}
        canPlaceInterna={canPlaceInterna}
        isLider={isLider}
      />
    </Suspense>
  );
}

function RequisicionFormContent({
  initialOsis,
  initialFacilitators,
  initialUserData,
  editRecord,
  userDept,
  userGerencia,
  isLocked,
  lockReason,
  banks,
  osiSessions,
  canPlaceInterna,
  isLider,
}: {
  initialOsis: OSIFullData[],
  initialFacilitators: any[],
  initialUserData: any,
  editRecord: any,
  userDept: string,
  userGerencia: string,
  isLocked: boolean,
  lockReason: string,
  banks: { id: number; nombre: string }[],
  osiSessions: { id: number; id_osi: number; nro_sesion: number; fecha: string | null; hora_inicio: string | null; hora_fin: string | null }[],
  canPlaceInterna: boolean,
  isLider: boolean,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || (editRecord?.id?.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [osis] = useState<OSIFullData[]>(initialOsis);
  const [facilitators] = useState<any[]>(initialFacilitators);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build a map of id_osi → OSISesion[] from the osi_sesion table.
  // Used as a fallback when v_osi_formato_completo.desglose_recursos_sesiones
  // is empty (which happens when no recursos are assigned per session).
  const osiSessionsMap = useMemo(() => {
    const map = new Map<number, OSISesion[]>();
    for (const s of osiSessions) {
      const list = map.get(s.id_osi) || [];
      list.push({
        id: s.id,
        id_sesion: s.id,
        nro_sesion: s.nro_sesion,
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        costo_traslado: null,
        costo_impresion_material: null,
        horas_honorarios_instructor: null,
        tarifa_hora_honorarios: null,
        costo_honorarios_instructor: null,
      });
      map.set(s.id_osi, list);
    }
    return map;
  }, [osiSessions]);

  // Get sessions for an OSI: prefer desglose_recursos_sesiones (has costs),
  // fall back to osiSessionsMap (from osi_sesion table, no costs).
  const getSessionsForOsi = (osi: OSIFullData): OSISesion[] => {
    const desglose = (osi.desglose_recursos_sesiones as OSISesion[] | null | undefined) || [];
    if (desglose.length > 0) return desglose;
    return osiSessionsMap.get(osi.id_osi) || [];
  };

  // Determine department-based default mode
  const userDepartment = initialUserData?.departamentos?.nombre || userDept || "";
  const deptLower = userDept.trim().toLowerCase();
  const isCapacitacionDept = deptLower.includes("capacitacion");
  const isServiciosDept = deptLower.includes("servicios") && deptLower.includes("tecnic");
  const isNegociosDept = deptLower.includes("negocios");
  // All users can place externas. Default mode is Interna for non-capacitacion/non-servicios
  // departments, but users can switch to Externa via the tab.
  const defaultIsGeneral = !isCapacitacionDept && !isServiciosDept;
  const editIsGeneral = editRecord ? (editRecord.tipo_solicitud === "Interno" || (!editRecord.tipo_solicitud && !editRecord.id_osi)) : defaultIsGeneral;
  const canUseExternal = true;
  // Gerencia Solicitante comes from the DB (departamentos.gerencia) when available,
  // falling back to the hardcoded mapping for safety.
  const defaultGerencia = userGerencia || mapGerenciaSolicitante(userDepartment);

  // For edit mode: reconstruct selectedOSIs from record
  const editSelectedOSIs: OSIFullData[] = editRecord ? 
    (editRecord.requisiciones_osis || []).map((ro: any) => 
      initialOsis.find((o: any) => o.id_osi === ro.id_osi)).filter(Boolean) : 
    (editRecord?.id_osi ? [initialOsis.find((o: any) => o.id_osi === editRecord.id_osi)].filter(Boolean) : []);

  const [formData, setFormData] = useState<RequisicionFormData>({
    selectedOSIs: editRecord ? editSelectedOSIs : [],
    is_general: editIsGeneral,
    corresponde_a: editRecord?.corresponde_a || "",
    fecha_solicitud: editRecord?.fecha_solicitud || new Date().toISOString().split("T")[0],
    tipo_solicitud: editRecord?.tipo_solicitud || (editIsGeneral ? "Interno" : "Externo"),
    nro_correlativo: editRecord?.nro_correlativo || "",
    tipo_servicio: editRecord?.tipo_servicio || "",
    gerencia_solicitante: editRecord?.gerencia_solicitante || defaultGerencia,
    departamento: editRecord?.departamento || userDepartment,
    solicitante: editRecord?.solicitante || initialUserData?.nombre_apellido || "",
    prioridad: editRecord?.prioridad || "Alta",
    id_sesion: editRecord?.id_sesion ?? null,
    selectedSesion: (() => {
      const sesId = editRecord?.id_sesion;
      if (!sesId) return null;
      const host = (editSelectedOSIs[0] || initialOsis.find((o: any) => o.id_osi === editRecord?.id_osi)) as OSIFullData | undefined;
      const sesiones = host ? getSessionsForOsi(host) : [];
      return sesiones.find((s) => s.id_sesion === sesId) || null;
    })(),

    // Details - Fixed Items Quantities (Removed from UI, defaulting to 1 in actions)
    cant_traslado: editRecord?.cant_traslado ?? 1,
    cant_impresion: editRecord?.cant_impresion ?? 1,
    cant_honorarios: editRecord?.cant_honorarios ?? 1,
    cant_informe_final: editRecord?.cant_informe_final ?? 1,

    // Details
    dias_traslado: editRecord?.dias_traslado ?? 1,
    costo_traslado: editRecord?.costo_traslado ?? 0,
    impresion_total: editRecord?.impresion_total ?? 0,
    honorarios_horas: editRecord?.honorarios_horas ?? 0,
    honorarios_costo_hora: editRecord?.honorarios_costo_hora ?? 0,
    honorarios_total: editRecord?.honorarios_total ?? 0,
    informe_final_total: editRecord?.informe_final_total ?? 0,

    // Per-OSI fixed items (Capacitación mode)
    osi_fixed_items: editRecord?.osi_fixed_items || [],

    // Additional dynamic items
    additional_items: editRecord?.additional_items || [],

    // Facilitator
    cod_facilitador: editRecord?.cod_facilitador?.toString() || "",
    facilitador: editRecord?.facilitador || "",
    cedula_facilitador: editRecord?.cedula_facilitador || "",
    rif_facilitador: editRecord?.rif_facilitador || "",
    telefono_facilitador: editRecord?.telefono_facilitador || "",
    banco: editRecord?.banco || "",
    nro_cuenta: editRecord?.nro_cuenta || "",

    observaciones: editRecord?.observaciones_compras || "",
  });

  const [mode, setMode] = useState<"general" | "capacitacion" | "servicios tecnicos" | "negocios">(
    editRecord
      ? (editIsGeneral ? "general" : (editRecord.gerencia_solicitante?.trim().toLowerCase() === "capacitacion" ? "capacitacion" : editRecord.gerencia_solicitante?.trim().toLowerCase() === "negocios" ? "negocios" : "servicios tecnicos"))
      : (defaultIsGeneral ? "general" : (isCapacitacionDept ? "capacitacion" : "servicios tecnicos"))
  );

  // Handle outside click for OSI dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isGeneralMode = mode === "general";
  // Capacitacion-specific behavior is now driven by the user's department (not gerencia_solicitante,
  // which is always the mapped grouping e.g. "Servicios").
  const isCapacitacion = !isGeneralMode && isCapacitacionDept;
  // Only Servicios Técnicos can select multiple OSIs; everyone else (Capacitación,
  // Negocios) is restricted to a single OSI selection. Internas have no OSI at all.
  const isSingleOSIMode = !isGeneralMode && !isServiciosDept;
  // OSI selector is only shown for externas (not internas).
  const showOSISelector = !isGeneralMode;
  const internaOsiTipoServicio = isCapacitacionDept ? "capacitacion" : "servicios tecnicos";

  const handleModeSwitch = (newMode: "general" | "capacitacion" | "servicios tecnicos" | "negocios") => {
    // Gerencia Solicitante comes from the DB (departamentos.gerencia) when available,
    // falling back to the hardcoded mapping for safety.
    const gerencia = userGerencia || mapGerenciaSolicitante(userDepartment);
    setMode(newMode);
    setFormData((prev) => ({
      ...prev,
      is_general: newMode === "general",
      gerencia_solicitante: gerencia,
      selectedOSIs: [],
      osi_fixed_items: [],
      id_sesion: null,
      selectedSesion: null,
      tipo_solicitud: newMode === "general" ? "Interno" : "Externo",
    }));
    setSearchTerm("");
  };

  // Ensure at least one empty row for personalized items
  useEffect(() => {
    if (formData.additional_items.length === 0) {
      const newItem: RequisicionItem = {
        id: Math.random().toString(36).substr(2, 9),
        cant: 1,
        unidad: "und",
        descripcion: "",
        costo_unitario: 0,
        total: 0,
        verificacion: "pendiente",
      };
      setFormData((prev) => ({
        ...prev,
        additional_items: [...prev.additional_items, newItem],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const osiTipoServicio = isGeneralMode ? internaOsiTipoServicio : (isCapacitacion ? "capacitacion" : "servicios tecnicos");

  const isOSIRequired = !isGeneralMode;

  const filteredOSIs = osis.filter((osi) => {
    if (!isNegociosDept) {
      const tipo = (osi.tipo_servicio || "").toLowerCase();
      if (osiTipoServicio === "servicios tecnicos") {
        if (!tipo.includes("servicios tecnicos") && !tipo.includes("servicio tecnico")) return false;
      } else if (!tipo.includes(osiTipoServicio)) {
        return false;
      }
    }
    if (osi.nro_osi?.toUpperCase().startsWith("PEN")) return false;
    const q = searchTerm.toLowerCase();
    if (q && !(osi.nro_osi?.toLowerCase().includes(q) || osi.servicio?.toLowerCase().includes(q))) return false;
    return true;
  });

  const isOSISelected = (osi: OSIFullData) =>
    formData.selectedOSIs.some((s) => s.id_osi === osi.id_osi);

  // Build a per-OSI fixed items block. When a session is provided, costs come from
  // that session; otherwise they come from the OSI aggregate.
  const buildFixedItem = (osi: OSIFullData, sesion?: OSISesion | null): OSIFixedItem => ({
    id_osi: osi.id_osi,
    nro_osi: osi.nro_osi,
    dias_traslado: 1,
    costo_traslado: sesion?.costo_traslado ?? osi.costo_traslado ?? 0,
    impresion_total: sesion?.costo_impresion_material ?? osi.costo_impresion_material ?? 0,
    honorarios_horas: sesion?.horas_honorarios_instructor ?? osi.horas_honorarios_instructor ?? 0,
    honorarios_costo_hora: sesion?.tarifa_hora_honorarios ?? osi.tarifa_hora_honorarios ?? 0,
    honorarios_total: sesion?.costo_honorarios_instructor ?? osi.costo_honorarios_instructor ?? 0,
    informe_final_total: 0,
    verificacion_traslado: "pendiente",
    verificacion_impresion: "pendiente",
    verificacion_honorarios: "pendiente",
    verificacion_informe_final: "pendiente",
  });

  const handleOSIToggle = (osi: OSIFullData) => {
    setFormData((prev) => {
      const already = prev.selectedOSIs.some((s) => s.id_osi === osi.id_osi);
      const newSelection = already
        ? prev.selectedOSIs.filter((s) => s.id_osi !== osi.id_osi)
        // Capacitación Externa only allows a single OSI: picking a new one replaces the current selection.
        : (isSingleOSIMode ? [osi] : [...prev.selectedOSIs, osi]);

      // Auto-populate cost fields ONLY for Capacitación department, and only in Externa mode.
      if (!isCapacitacionDept || isGeneralMode) {
        return {
          ...prev,
          selectedOSIs: newSelection,
          id_sesion: null,
          selectedSesion: null,
        };
      }

      // Manage per-OSI fixed items
      let newFixedItems: OSIFixedItem[];
      let newSesion: OSISesion | null = null;
      let newSesionId: number | null = null;
      if (already) {
        // Removing this OSI - remove its fixed items block
        newFixedItems = prev.osi_fixed_items.filter((fi) => fi.id_osi !== osi.id_osi);
      } else {
        const sesiones = getSessionsForOsi(osi);
        if (sesiones.length > 1) {
          // Multi-session OSI: defer auto-populate until the user picks a session.
          newSesion = null;
          newSesionId = null;
          newFixedItems = isSingleOSIMode ? [] : prev.osi_fixed_items;
        } else if (sesiones.length === 1) {
          // Single session: auto-select it and populate from that session.
          newSesion = sesiones[0];
          newSesionId = sesiones[0].id_sesion;
          newFixedItems = isSingleOSIMode
            ? [buildFixedItem(osi, newSesion)]
            : [...prev.osi_fixed_items, buildFixedItem(osi, newSesion)];
        } else {
          // No sessions: populate from the OSI aggregate (legacy behavior).
          newFixedItems = isSingleOSIMode
            ? [buildFixedItem(osi, null)]
            : [...prev.osi_fixed_items, buildFixedItem(osi, null)];
        }
      }

      // Keep legacy single-value fields in sync with first OSI for backward compat
      const firstFixed = newFixedItems[0];
      return {
        ...prev,
        selectedOSIs: newSelection,
        osi_fixed_items: newFixedItems,
        id_sesion: newSesionId,
        selectedSesion: newSesion,
        costo_traslado: firstFixed?.costo_traslado || 0,
        impresion_total: firstFixed?.impresion_total || 0,
        honorarios_horas: firstFixed?.honorarios_horas || 0,
        honorarios_costo_hora: firstFixed?.honorarios_costo_hora || 0,
        honorarios_total: firstFixed?.honorarios_total || 0,
        dias_traslado: firstFixed?.dias_traslado ?? 1,
        informe_final_total: firstFixed?.informe_final_total || 0,
      };
    });
  };

  // When a capacitacion user picks a session for a multi-session OSI, recompute
  // the fixed-items block from that session's costs.
  const handleSesionChange = (idSesion: number) => {
    setFormData((prev) => {
      const osi = prev.selectedOSIs[0];
      if (!osi) return prev;
      const sesiones = getSessionsForOsi(osi);
      const sesion = sesiones.find((s) => s.id_sesion === idSesion) || null;
      if (!sesion) return prev;
      const newFixedItems = isSingleOSIMode
        ? [buildFixedItem(osi, sesion)]
        : prev.osi_fixed_items.map((fi) => (fi.id_osi === osi.id_osi ? buildFixedItem(osi, sesion) : fi));
      const firstFixed = newFixedItems[0];
      return {
        ...prev,
        id_sesion: idSesion,
        selectedSesion: sesion,
        osi_fixed_items: newFixedItems,
        costo_traslado: firstFixed?.costo_traslado || 0,
        impresion_total: firstFixed?.impresion_total || 0,
        honorarios_horas: firstFixed?.honorarios_horas || 0,
        honorarios_costo_hora: firstFixed?.honorarios_costo_hora || 0,
        honorarios_total: firstFixed?.honorarios_total || 0,
        dias_traslado: firstFixed?.dias_traslado ?? 1,
        informe_final_total: firstFixed?.informe_final_total || 0,
      };
    });
  };

  const updateOSIFixedItem = (idOsi: number, updates: Partial<OSIFixedItem>) => {
    setFormData((prev) => {
      const newFixedItems = prev.osi_fixed_items.map((fi) => {
        if (fi.id_osi === idOsi) {
          const updated = { ...fi, ...updates };
          // Recalculate honorarios_total if relevant fields change
          if ("honorarios_horas" in updates || "honorarios_costo_hora" in updates) {
            updated.honorarios_total = (updated.honorarios_horas || 0) * (updated.honorarios_costo_hora || 0);
          }
          return updated;
        }
        return fi;
      });
      // Keep legacy single-value fields in sync with first OSI
      const firstFixed = newFixedItems[0];
      return {
        ...prev,
        osi_fixed_items: newFixedItems,
        costo_traslado: firstFixed?.costo_traslado || 0,
        impresion_total: firstFixed?.impresion_total || 0,
        honorarios_horas: firstFixed?.honorarios_horas || 0,
        honorarios_costo_hora: firstFixed?.honorarios_costo_hora || 0,
        honorarios_total: firstFixed?.honorarios_total || 0,
        dias_traslado: firstFixed?.dias_traslado ?? 1,
        informe_final_total: firstFixed?.informe_final_total || 0,
      };
    });
  };

  const removeOSIFixedItemRow = (idOsi: number) => {
    setFormData((prev) => {
      const newFixedItems = prev.osi_fixed_items.filter((fi) => fi.id_osi !== idOsi);
      const newSelection = prev.selectedOSIs.filter((s) => s.id_osi !== idOsi);
      const firstFixed = newFixedItems[0];
      return {
        ...prev,
        osi_fixed_items: newFixedItems,
        selectedOSIs: newSelection,
        costo_traslado: firstFixed?.costo_traslado || 0,
        impresion_total: firstFixed?.impresion_total || 0,
        honorarios_horas: firstFixed?.honorarios_horas || 0,
        honorarios_costo_hora: firstFixed?.honorarios_costo_hora || 0,
        honorarios_total: firstFixed?.honorarios_total || 0,
        dias_traslado: firstFixed?.dias_traslado ?? 1,
        informe_final_total: firstFixed?.informe_final_total || 0,
      };
    });
  };

  const handleFacilitatorChange = (facilitatorId: string) => {
    const facilitator = facilitators.find((f) => f.id === parseInt(facilitatorId));
    const mainBank = facilitator?.datos_bancarios?.find((db: any) => db.es_principal) || facilitator?.datos_bancarios?.[0];
    
    setFormData((prev) => ({
      ...prev,
      cod_facilitador: facilitatorId,
      facilitador: facilitator?.nombre_apellido || "",
      cedula_facilitador: facilitator?.cedula || "",
      rif_facilitador: facilitator?.rif || "",
      telefono_facilitador: facilitator?.telefono || "",
      banco: mainBank?.banco || "",
      nro_cuenta: mainBank?.nro_cuenta || "",
    }));
  };

  const addAdditionalItem = () => {
    const newItem: RequisicionItem = {
      id: Math.random().toString(36).substr(2, 9),
      cant: 1,
      unidad: "und",
      descripcion: "",
      costo_unitario: 0,
      total: 0,
      verificacion: isGeneralMode ? "pendiente" : undefined,
    };
    setFormData((prev) => ({
      ...prev,
      additional_items: [...prev.additional_items, newItem],
    }));
  };

  const removeAdditionalItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      additional_items: prev.additional_items.filter((item) => item.id !== id),
    }));
  };

  const updateAdditionalItem = (id: string, updates: Partial<RequisicionItem>) => {
    setFormData((prev) => ({
      ...prev,
      additional_items: prev.additional_items.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updates };
          updatedItem.total = updatedItem.cant * updatedItem.costo_unitario;
          return updatedItem;
        }
        return item;
      }),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOSIRequired && formData.selectedOSIs.length === 0) {
      alert("Por favor seleccione al menos una OSI");
      return;
    }
    if (isLocked) {
      alert(lockReason || "Esta requisición está bloqueada para edición.");
      return;
    }
    if (isGeneralMode && !canPlaceInterna) {
      alert("Las requisiciones internas deben ser colocadas por el coordinador de su departamento.");
      return;
    }

    setIsLoading(true);
    try {
      if (editId) {
        await updateRequisicionRecord(parseInt(editId), formData);
      } else {
        await createRequisicionRecord(formData);
      }
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/capacitacion/requisiciones");
      }, 2000);
    } catch (error) {
      console.error("Error saving requisition:", error);
      alert("Error al guardar el registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-10 relative">
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 bg-white shadow-2xl border-none">
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¡Éxito!</h3>
              <p className="text-gray-600">
                La solicitud de requisición ha sido guardada correctamente.
              </p>
              <div className="mt-6 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 animate-[progress_2s_linear]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {isLocked && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-amber-800 text-sm font-medium">
          <Lock className="h-4 w-4" />
          {lockReason || "Esta requisición está bloqueada para edición."}
        </div>
      )}

      {/* Blocking notice: analistas cannot place internas. Only the department's
          coordinador (or, if the dept has no coordinador, the gerencia lider) can. */}
      {isGeneralMode && !canPlaceInterna && !isLocked && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg flex items-start gap-3 text-blue-900 text-sm">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold mb-1">Requisiciones internas restringidas</p>
            <p>
              Las requisiciones internas deben ser colocadas por el coordinador de su
              departamento. Solicite a su coordinador que la coloque por usted.
            </p>
          </div>
        </div>
      )}

      {/* Mode tabs — visible to all users */}
      <div className="flex gap-1 mb-4">
        <button
          type="button"
          onClick={() => handleModeSwitch("general")}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
            isGeneralMode
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Interna
        </button>
        {canUseExternal && (
        <button
          type="button"
          onClick={() => handleModeSwitch(isCapacitacionDept ? "capacitacion" : isServiciosDept ? "servicios tecnicos" : "negocios")}
          className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
            !isGeneralMode
              ? "border-blue-600 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Externa
        </button>
        )}
      </div>

      <Card className="shadow-md border-gray-300">
        <CardContent className="p-0">
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Fecha de solicitud:
            </div>
            <div className={`p-3 border-r border-gray-300 ${showOSISelector ? "col-span-4" : "col-span-9"}`}>
              <Input 
                type="date"
                value={formData.fecha_solicitud}
                onChange={(e) => setFormData(p => ({...p, fecha_solicitud: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0"
              />
            </div>
            {showOSISelector && (
            <>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              N° OSI:
            </div>
            <div className="col-span-3 p-3 relative" ref={dropdownRef}>
               <Input 
                  placeholder="Buscar OSI..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="h-8 border-none focus-visible:ring-0 px-0 font-bold text-blue-700"
                />
                {isDropdownOpen && filteredOSIs.length > 0 && (
                  <div className="absolute z-50 w-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-48 overflow-y-auto">
                    {filteredOSIs.map((osi) => (
                      <div
                        key={osi.id_osi}
                        onClick={() => handleOSIToggle(osi)}
                        className={`px-3 py-2 cursor-pointer text-xs ${
                          isOSISelected(osi) ? "bg-blue-50" : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          {isOSISelected(osi) && <CheckCircle2 className="h-3 w-3 text-blue-600" />}
                          {osi.nro_osi}
                        </div>
                        <div className="text-gray-600 truncate">{osi.servicio}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
            </>
            )}
          </div>

          {/* Selected OSI chips */}
          {showOSISelector && formData.selectedOSIs.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 border-b border-gray-300 bg-blue-50/30">
              {formData.selectedOSIs.map((osi) => (
                <span
                  key={osi.id_osi}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold"
                >
                  {osi.nro_osi}
                  <button
                    type="button"
                    onClick={() => handleOSIToggle(osi)}
                    className="hover:text-blue-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Session selector — Capacitación Externa (always visible when sessions exist) */}
          {isCapacitacion && !isGeneralMode && formData.selectedOSIs.length > 0 && (() => {
            const osi = formData.selectedOSIs[0];
            const sesiones = osi ? getSessionsForOsi(osi) : [];
            if (sesiones.length === 0) return null;
            return (
              <div className="grid grid-cols-12 border-b border-gray-300 bg-amber-50/40">
                <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
                  Sesión:
                </div>
                <div className="col-span-9 p-3">
                  <Select
                    value={formData.id_sesion?.toString() || ""}
                    onValueChange={(v: string) => handleSesionChange(parseInt(v))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccione la sesión..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sesiones.map((s) => (
                        <SelectItem key={s.id_sesion} value={s.id_sesion.toString()}>
                          {`Sesión #${s.nro_sesion ?? s.id_sesion}${s.fecha ? ` — ${s.fecha}` : ""}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Gerencia solicitante:</span>
            </div>
            <div className="col-span-3 p-3 border-r border-gray-300">
              <Input
                value={formData.gerencia_solicitante}
                readOnly
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-medium uppercase bg-gray-50/50 cursor-not-allowed"
              />
            </div>
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Departamento:</span>
            </div>
            <div className="col-span-3 p-3">
              <Input
                value={formData.departamento}
                readOnly
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-medium uppercase bg-gray-50/50 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Nombre del solicitante:</span>
            </div>
            <div className="col-span-9 p-3 flex items-center">
              <Input
                value={formData.solicitante}
                onChange={(e) => setFormData(p => ({...p, solicitante: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-bold uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Prioridad:
            </div>
            <div className="col-span-9 p-3 flex gap-8 items-center">
              <RadioGroup 
                value={formData.prioridad} 
                onValueChange={(v: any) => setFormData(p => ({...p, prioridad: v}))}
                className="grid-flow-col"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Alta" id="p-alta" />
                  <Label htmlFor="p-alta" className="text-xs">Alta</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Media" id="p-media" />
                  <Label htmlFor="p-media" className="text-xs">Media</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Baja" id="p-baja" />
                  <Label htmlFor="p-baja" className="text-xs">Baja</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Details Table section */}
          <div className="bg-gray-200 py-1 font-bold text-center text-sm border-b border-gray-300 uppercase">
            Detalles de la solicitud
          </div>
          
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-center border-b border-gray-300">
                <th className="p-2 border-r border-gray-300 w-12">ITEM</th>
                <th className="p-2 border-r border-gray-300 w-20">UNIDAD/ CONCEPTO</th>
                <th className="p-2 border-r border-gray-300 w-16">CANT</th>
                <th className="p-2 border-r border-gray-300">DESCRIPCIÓN</th>
                {!isGeneralMode && (
                  <th className="p-2 border-r border-gray-300 w-32">PRECIO U.</th>
                )}
                {formData.selectedOSIs.length > 1 && (
                  <th className="p-2 border-r border-gray-300 w-32">OSI</th>
                )}
                {isGeneralMode ? (
                  <th className="p-2 w-24">VERIF.</th>
                ) : (
                  <th className="p-2 w-32">TOTAL</th>
                )}
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {isCapacitacion && (() => {
                let dynItemNum = formData.osi_fixed_items.length * 4 + 1;
                return (<>
                {formData.osi_fixed_items.map((osiFi, osiIdx) => {
                const osiTotal =
                  (osiFi.dias_traslado || 0) * (osiFi.costo_traslado || 0) +
                  (osiFi.impresion_total || 0) +
                  (osiFi.honorarios_total || 0) +
                  (osiFi.informe_final_total || 0);
                return (
                <Fragment key={`osi-block-${osiFi.id_osi}`}>
              {/* OSI block header */}
              <tr className="bg-blue-100/60 border-b border-gray-300">
                <td colSpan={formData.selectedOSIs.length > 1 ? 8 : 7} className="p-2 font-bold text-xs text-blue-800 flex items-center justify-between">
                  <span>OSI: {osiFi.nro_osi || `#${osiFi.id_osi}`}</span>
                  <button
                    type="button"
                    onClick={() => removeOSIFixedItemRow(osiFi.id_osi)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
              {/* Item 1: Traslado */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 1}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">T</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={osiFi.dias_traslado || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { dias_traslado: parseInt(e.target.value) || 0 })}
                      className="h-6 w-12 border-gray-300 p-1 text-center" 
                    />
                    <span className="uppercase text-[10px] font-medium">DÍAS DE TRASL. COSTO X C/U $</span>
                    <Input 
                      type="number" 
                      value={osiFi.costo_traslado || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { costo_traslado: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-20 border-gray-300 p-1 font-bold" 
                    />
                  </div>
                </td>
                <td className="p-2 border-r border-gray-300 text-center font-bold">
                  ${((osiFi.dias_traslado || 0) * (osiFi.costo_traslado || 0)).toFixed(2)}
                </td>
                {formData.selectedOSIs.length > 1 && (
                  <td className="p-2 border-r border-gray-300 text-center font-bold">
                    ${((osiFi.dias_traslado || 0) * (osiFi.costo_traslado || 0)).toFixed(2)}
                  </td>
                )}
                <td className="p-2 text-center font-bold">
                  {""}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 2: Impresión */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 2}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">I</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">IMPRESIÓN TOTAL $</span>
                    <Input 
                      type="number" 
                      value={osiFi.impresion_total || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { impresion_total: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                    />
                  </div>
                </td>
                <td className="p-2 border-r border-gray-300 text-center font-bold">
                  ${(osiFi.impresion_total || 0).toFixed(2)}
                </td>
                {formData.selectedOSIs.length > 1 && (
                  <td className="p-2 border-r border-gray-300 text-center font-bold">
                    ${(osiFi.impresion_total || 0).toFixed(2)}
                  </td>
                )}
                <td className="p-2 text-center font-bold">
                  {""}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 3: Honorarios */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 3}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">H</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="font-medium uppercase">HONORARIOS $</span>
                    <Input 
                      type="number" 
                      value={osiFi.honorarios_costo_hora || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { honorarios_costo_hora: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                    />
                    <span className="font-medium uppercase">, POR HORAS</span>
                    <Input 
                      type="number" 
                      value={osiFi.honorarios_horas || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { honorarios_horas: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-12 border-gray-300 p-1 text-center" 
                    />
                  </div>
                </td>
                <td className="p-2 border-r border-gray-300 text-center font-bold">
                  ${(osiFi.honorarios_total || 0).toFixed(2)}
                </td>
                {formData.selectedOSIs.length > 1 && (
                  <td className="p-2 border-r border-gray-300 text-center font-bold">
                    ${(osiFi.honorarios_total || 0).toFixed(2)}
                  </td>
                )}
                <td className="p-2 text-center font-bold">
                  {""}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Item 4: Informe Final */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">{osiIdx * 4 + 4}</td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase whitespace-nowrap">IF</td>
                <td className="p-2 border-r border-gray-300"></td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-medium">INFORME FINAL $</span>
                    <Input 
                      type="number" 
                      value={osiFi.informe_final_total || ""} 
                      onChange={(e) => updateOSIFixedItem(osiFi.id_osi, { informe_final_total: parseFloat(e.target.value) || 0 })}
                      className="h-6 w-24 border-gray-300 p-1 font-bold" 
                      placeholder="0.00"
                    />
                  </div>
                </td>
                <td className="p-2 border-r border-gray-300 text-center font-bold">
                  ${(osiFi.informe_final_total || 0).toFixed(2)}
                </td>
                {formData.selectedOSIs.length > 1 && (
                  <td className="p-2 border-r border-gray-300 text-center font-bold">
                    ${(osiFi.informe_final_total || 0).toFixed(2)}
                  </td>
                )}
                <td className="p-2 text-center font-bold">
                  {""}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Per-OSI subtotal */}
              <tr className="bg-gray-50 border-b border-gray-300">
                <td colSpan={4} className="p-2 text-right font-bold uppercase text-[10px]">Subtotal OSI {osiFi.nro_osi}:</td>
                <td className="p-2 border-r border-gray-300 text-center font-bold text-xs">
                  ${osiTotal.toFixed(2)}
                </td>
                {formData.selectedOSIs.length > 1 && (
                  <td className="p-2 border-r border-gray-300"></td>
                )}
                <td className="p-2 text-center font-bold text-xs bg-yellow-50">
                  ${osiTotal.toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              {/* Dynamic items assigned to this OSI */}
              {formData.additional_items.filter(item => item.id_osi === osiFi.id_osi).map((item) => {
                const dynIdx = dynItemNum++;
                return (
                  <tr key={item.id} className="border-b border-gray-300 bg-blue-50/30">
                    <td className="p-2 text-center border-r border-gray-300 font-bold">{dynIdx}</td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        className="h-6 w-full text-center border-gray-300 p-1 uppercase font-bold" 
                        value={item.unidad}
                        onChange={(e) => updateAdditionalItem(item.id, { unidad: e.target.value })}
                        placeholder="und"
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        type="number"
                        className="h-6 w-full text-center border-gray-300 p-1" 
                        value={item.cant}
                        onChange={(e) => updateAdditionalItem(item.id, { cant: parseInt(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        className="h-6 w-full border-gray-300 p-1 uppercase" 
                        value={item.descripcion}
                        onChange={(e) => updateAdditionalItem(item.id, { descripcion: e.target.value })}
                        placeholder="Descripción del item..."
                      />
                    </td>
                    {!isGeneralMode && (
                      <td className="p-2 border-r border-gray-300">
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <Input 
                            type="number"
                            className="h-6 w-full border-gray-300 p-1 font-bold text-center" 
                            value={item.costo_unitario}
                            onChange={(e) => updateAdditionalItem(item.id, { costo_unitario: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </td>
                    )}
                    {formData.selectedOSIs.length > 1 && (
                      <td className="p-2 border-r border-gray-300">
                        <Select
                          value={item.id_osi?.toString() || ""}
                          onValueChange={(v: string) => updateAdditionalItem(item.id, { id_osi: parseInt(v) })}
                        >
                          <SelectTrigger className="h-6 text-xs border-gray-300">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.selectedOSIs.map((osi) => (
                              <SelectItem key={osi.id_osi} value={osi.id_osi.toString()}>
                                {osi.nro_osi}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    {isGeneralMode ? (
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.verificacion === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.verificacion === "listo" ? "Listo" : "Pendiente"}
                        </span>
                      </td>
                    ) : (
                      <td className="p-2 text-center font-bold">
                        ${item.total.toFixed(2)}
                      </td>
                    )}
                    <td className="p-2 border-l border-gray-300 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeAdditionalItem(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
                </Fragment>
                );
              })}
              {/* Unassigned dynamic items (Capacitación) */}
              {formData.additional_items.filter(item => item.id_osi == null).map((item) => {
                const dynIdx = dynItemNum++;
                return (
                  <tr key={item.id} className="border-b border-gray-300 bg-blue-50/30">
                    <td className="p-2 text-center border-r border-gray-300 font-bold">{dynIdx}</td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        className="h-6 w-full text-center border-gray-300 p-1 uppercase font-bold" 
                        value={item.unidad}
                        onChange={(e) => updateAdditionalItem(item.id, { unidad: e.target.value })}
                        placeholder="und"
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        type="number"
                        className="h-6 w-full text-center border-gray-300 p-1" 
                        value={item.cant}
                        onChange={(e) => updateAdditionalItem(item.id, { cant: parseInt(e.target.value) || 1 })}
                      />
                    </td>
                    <td className="p-2 border-r border-gray-300">
                      <Input 
                        className="h-6 w-full border-gray-300 p-1 uppercase" 
                        value={item.descripcion}
                        onChange={(e) => updateAdditionalItem(item.id, { descripcion: e.target.value })}
                        placeholder="Descripción del item..."
                      />
                    </td>
                    {!isGeneralMode && (
                      <td className="p-2 border-r border-gray-300">
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <Input 
                            type="number"
                            className="h-6 w-full border-gray-300 p-1 font-bold text-center" 
                            value={item.costo_unitario}
                            onChange={(e) => updateAdditionalItem(item.id, { costo_unitario: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </td>
                    )}
                    {formData.selectedOSIs.length > 1 && (
                      <td className="p-2 border-r border-gray-300">
                        <Select
                          value={item.id_osi?.toString() || ""}
                          onValueChange={(v: string) => updateAdditionalItem(item.id, { id_osi: parseInt(v) })}
                        >
                          <SelectTrigger className="h-6 text-xs border-gray-300">
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.selectedOSIs.map((osi) => (
                              <SelectItem key={osi.id_osi} value={osi.id_osi.toString()}>
                                {osi.nro_osi}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    {isGeneralMode ? (
                      <td className="p-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          item.verificacion === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {item.verificacion === "listo" ? "Listo" : "Pendiente"}
                        </span>
                      </td>
                    ) : (
                      <td className="p-2 text-center font-bold">
                        ${item.total.toFixed(2)}
                      </td>
                    )}
                    <td className="p-2 border-l border-gray-300 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeAdditionalItem(item.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              </>
              );
              })()}

              {/* Additional Items (non-Capacitación) */}
              {!isCapacitacion && formData.additional_items.map((item, index) => (
                <tr key={item.id} className="border-b border-gray-300 bg-blue-50/30">
                  <td className="p-2 text-center border-r border-gray-300 font-bold">{index + 1}</td>
                  <td className="p-2 border-r border-gray-300">
                    <Input 
                      className="h-6 w-full text-center border-gray-300 p-1 uppercase font-bold" 
                      value={item.unidad}
                      onChange={(e) => updateAdditionalItem(item.id, { unidad: e.target.value })}
                      placeholder="und"
                    />
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <Input 
                      type="number"
                      className="h-6 w-full text-center border-gray-300 p-1" 
                      value={item.cant}
                      onChange={(e) => updateAdditionalItem(item.id, { cant: parseInt(e.target.value) || 1 })}
                    />
                  </td>
                  <td className="p-2 border-r border-gray-300">
                    <Input 
                      className="h-6 w-full border-gray-300 p-1 uppercase" 
                      value={item.descripcion}
                      onChange={(e) => updateAdditionalItem(item.id, { descripcion: e.target.value })}
                      placeholder="Descripción del item..."
                    />
                  </td>
                  {!isGeneralMode && (
                    <td className="p-2 border-r border-gray-300">
                      <div className="flex items-center gap-1">
                        <span>$</span>
                        <Input 
                          type="number"
                          className="h-6 w-full border-gray-300 p-1 font-bold text-center" 
                          value={item.costo_unitario}
                          onChange={(e) => updateAdditionalItem(item.id, { costo_unitario: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </td>
                  )}
                  {formData.selectedOSIs.length > 1 && (
                    <td className="p-2 border-r border-gray-300">
                      <Select
                        value={item.id_osi?.toString() || ""}
                        onValueChange={(v: string) => updateAdditionalItem(item.id, { id_osi: parseInt(v) })}
                      >
                        <SelectTrigger className="h-6 text-xs border-gray-300">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.selectedOSIs.map((osi) => (
                            <SelectItem key={osi.id_osi} value={osi.id_osi.toString()}>
                              {osi.nro_osi}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {isGeneralMode ? (
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.verificacion === "listo" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.verificacion === "listo" ? "Listo" : "Pendiente"}
                      </span>
                    </td>
                  ) : (
                    <td className="p-2 text-center font-bold">
                      ${item.total.toFixed(2)}
                    </td>
                  )}
                  <td className="p-2 border-l border-gray-300 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeAdditionalItem(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}

              {!isGeneralMode && (
              <tr className="bg-gray-100 border-b border-gray-300">
                <td colSpan={formData.selectedOSIs.length > 1 ? 6 : 5} className="p-2 text-right font-bold uppercase text-sm">Total General:</td>
                <td className="p-2 text-center font-bold text-sm bg-yellow-50">
                  ${(
                    (isCapacitacion
                      ? formData.osi_fixed_items.reduce((sum, fi) =>
                          sum +
                          (fi.dias_traslado || 0) * (fi.costo_traslado || 0) +
                          (fi.impresion_total || 0) +
                          (fi.honorarios_total || 0) +
                          (fi.informe_final_total || 0), 0)
                      : 0) +
                    formData.additional_items.reduce((sum, item) => sum + item.total, 0)
                  ).toFixed(2)}
                </td>
                <td className="p-2 border-l border-gray-300"></td>
              </tr>
              )}
            </tbody>
          </table>

          {/* Add Item Button */}
          <div className="p-2 border-b border-gray-300 flex justify-center bg-gray-50/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs flex gap-2 border-dashed border-gray-400"
              onClick={addAdditionalItem}
            >
              <Plus size={14} />
              Añadir Item Personalizado
            </Button>
          </div>

          <div className="bg-gray-200 py-0.5 font-bold px-2 text-sm border-b border-gray-300 uppercase">
            Observaciones
          </div>
          <div className="p-2 border-b border-gray-300">
            <Textarea 
              value={formData.observaciones}
              onChange={(e) => setFormData(p => ({...p, observaciones: e.target.value}))}
              className="min-h-[60px] text-xs border-gray-300 uppercase"
              placeholder="Escriba aquí cualquier observación adicional..."
            />
          </div>

          {isCapacitacion && (
          <>
          <div className="grid grid-cols-12 border-b border-gray-300 text-xs">
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Facilitador Asignado:
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              DATOS PERSONALES
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              CEDULA
            </div>
            <div className="col-span-3 p-2 bg-gray-50 flex items-center font-bold">
              RIF
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300 text-xs h-12">
            <div className="col-span-3 border-r border-gray-300 flex flex-col">
              <div className="flex-1">
                <Select onValueChange={handleFacilitatorChange} value={formData.cod_facilitador}>
                  <SelectTrigger className="h-full border-none focus:ring-0 rounded-none text-xs">
                    <SelectValue placeholder="Seleccionar Facilitador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilitators.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nombre_apellido}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="px-2 pb-1 text-[10px] text-gray-500 border-t border-gray-100 flex justify-between">
                <span>Cód Facilitador:</span>
                <span className="font-bold">{formData.cod_facilitador || "-"}</span>
              </div>
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {formData.facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold">
              {formData.cedula_facilitador || "-"}
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold uppercase">
              {formData.rif_facilitador || "-"}
            </div>
          </div>

          <div className="grid grid-cols-12 text-xs h-10 border-b border-gray-300">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center">
              <select
                value={formData.banco || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, banco: e.target.value }))}
                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">Seleccionar...</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.nombre}>{bank.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-3 p-2 border-r border-gray-300 flex items-center font-bold break-all">
              {formData.nro_cuenta || "-"}
            </div>
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Tel.
            </div>
            <div className="col-span-2 p-2 flex items-center font-bold">
              {formData.telefono_facilitador || "-"}
            </div>
          </div>
          </>
          )}

          <div className="p-4 flex justify-end gap-3 bg-gray-50">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isLocked || (isGeneralMode && !canPlaceInterna)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Guardando..." : editId ? "Actualizar Requisición" : "Crear Requisición"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
