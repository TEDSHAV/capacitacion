"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ControlServiciosFormData, OSIFullData } from "@/types";
import { Button } from "@/components/ui/button";
import {
  getOSIForControlServicios,
  createControlServiciosRecord,
  getFacilitatorsForDropdown,
} from "@/app/actions/control-servicios";

export default function ControlServiciosForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [osis, setOsis] = useState<OSIFullData[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<ControlServiciosFormData>({
    selectedOSI: null,
    ejecutada_mes_curso: "",
    pendiente_mes_anterior: "",
    participantes_asistidos: null,
    certificados_reales: null,
    pvc_reales: null,
    responsable: "",
    dias_traslado_t: null,
    cod_facilitador: "",
    facilitador: "",
    observaciones: "",
    indicador_facilitador: null,
  });

  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  useEffect(() => {
    // Load OSIs and facilitators on mount
    async function loadData() {
      try {
        const [osisData, facilitatorsData] = await Promise.all([
          fetch("/api/osi-list").then((res) => res.json()),
          getFacilitatorsForDropdown(),
        ]);

        if (osisData) {
          setOsis(osisData);
        }
        if (facilitatorsData) {
          setFacilitators(facilitatorsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    }

    loadData();
  }, []);

  const filteredOSIs = osis.filter(
    (osi) =>
      osi.nro_osi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      osi.servicio?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleOSISelect = async (osi: OSIFullData) => {
    setFormData((prev) => ({ ...prev, selectedOSI: osi }));
    setIsDropdownOpen(false);
    setSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.selectedOSI) {
      alert("Por favor seleccione una OSI");
      return;
    }

    setIsLoading(true);
    try {
      await createControlServiciosRecord(formData);
      router.push("/dashboard/capacitacion/planificacion-servicios/lista");
    } catch (error) {
      console.error("Error creating record:", error);
      alert("Error al crear el registro");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacilitatorChange = (facilitatorId: string) => {
    const facilitator = facilitators.find(
      (f) => f.id === parseInt(facilitatorId),
    );
    setFormData((prev) => ({
      ...prev,
      cod_facilitador: facilitatorId,
      facilitator: facilitator?.nombre_apellido || "",
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* OSI Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Seleccionar OSI *
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por número de OSI o nombre del curso..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredOSIs.map((osi) => (
                <div
                  key={osi.id_osi}
                  onClick={() => handleOSISelect(osi)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="font-medium text-gray-900">{osi.nro_osi}</div>
                  <div className="text-sm text-gray-600">{osi.servicio}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {formData.selectedOSI && (
        <div className="space-y-6">
          {/* Auto-populated fields (read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="col-span-2 font-semibold text-gray-900">
              Datos de OSI (Auto-populados)
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MES DE RECEPCION
              </label>
              <input
                type="text"
                value={formData.selectedOSI.fecha_emision?.split("T")[0] || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NUMERO DE OSI
              </label>
              <input
                type="text"
                value={formData.selectedOSI.nro_osi || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PARTICIPANTE X OSIS
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.participantes_ejecucion?.toString() || ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FECHA DE OSI
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.fecha_inicio_real?.split("T")[0] || ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                COD-CLIENTE
              </label>
              <input
                type="text"
                value={formData.selectedOSI.codigo_cliente?.toString() || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NOMBRE DEL CURSO
              </label>
              <input
                type="text"
                value={formData.selectedOSI.servicio || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FECHA DE EJECUCIÓN
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.fecha_inicio_real?.split("T")[0] || ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MONTO X TRASLADO MT
              </label>
              <input
                type="text"
                value={formData.selectedOSI.costo_traslado?.toString() || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HORAS/HONORARIOS H
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.horas_honorarios_instructor?.toString() ||
                  ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                COSTO POR HORA
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.tarifa_hora_honorarios?.toString() || ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GASTO DE IMPRESIÓN I
              </label>
              <input
                type="text"
                value={
                  formData.selectedOSI.costo_impresion_material?.toString() ||
                  ""
                }
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
              />
            </div>
          </div>

          {/* Manual input fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <h3 className="col-span-2 font-semibold text-gray-900">
              Datos de Control (Manual)
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EJECUTADA EN EL MES EN CURSO
              </label>
              <select
                value={formData.ejecutada_mes_curso}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ejecutada_mes_curso: e.target.value as any,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">(blank)</option>
                <option value="ejecutada">Ejecutada</option>
                <option value="no ejecutada">No Ejecutada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PENDIENTE DEL MES ANTERIOR PERO EJECUTADA EN EL MES EN CURSO
              </label>
              <select
                value={formData.pendiente_mes_anterior}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pendiente_mes_anterior: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar mes</option>
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PARTICIPANTES ASISTIDOS
              </label>
              <input
                type="number"
                value={formData.participantes_asistidos || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    participantes_asistidos: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CERTIFICADOS REALES
              </label>
              <input
                type="number"
                value={formData.certificados_reales || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    certificados_reales: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PVC REALES
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.pvc_reales || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pvc_reales: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RESPONSABLE
              </label>
              <input
                type="text"
                value={formData.responsable}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    responsable: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DIAS TRASLADO T
              </label>
              <input
                type="number"
                value={formData.dias_traslado_t || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dias_traslado_t: e.target.value
                      ? parseInt(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FACILITADOR
              </label>
              <select
                value={formData.cod_facilitador}
                onChange={(e) => handleFacilitatorChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar facilitador</option>
                {facilitators.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.nombre_apellido}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                INDICADOR PARA FACILITADORES
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.indicador_facilitador || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    indicador_facilitador: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OBSERVACIONES
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" loading={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Registro"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
