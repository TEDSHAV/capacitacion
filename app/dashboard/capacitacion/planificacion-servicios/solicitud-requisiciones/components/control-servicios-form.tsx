"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ControlServiciosFormData, OSIFullData } from "@/types";
import { Button } from "@/components/ui/button";
import {
  getOSIForControlServicios,
  createControlServiciosRecord,
  getFacilitatorsForDropdown,
  getCurrentUser,
} from "@/app/actions/control-servicios";
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

export default function ControlServiciosForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [osis, setOsis] = useState<OSIFullData[]>([]);
  const [facilitators, setFacilitators] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<ControlServiciosFormData>({
    selectedOSI: null,
    corresponde_a: "Servicios",
    fecha_solicitud: new Date().toISOString().split("T")[0],
    tipo_solicitud: "Interno",
    nro_correlativo: "GS-DC-",
    tipo_servicio: "Capacitación",
    gerencia_solicitante: "SERVICIOS",
    solicitante: "",
    prioridad: "Alta",

    // Details
    dias_traslado: 0,
    costo_traslado: 0,
    impresion_total: 0,
    honorarios_horas: 0,
    honorarios_costo_hora: 0,
    honorarios_total: 0,
    informe_final_total: 0,

    // Facilitator
    cod_facilitador: "",
    facilitador: "",
    cedula_facilitador: "",
    rif_facilitador: "",
    banco: "",
    nro_cuenta: "",

    observaciones: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [osisData, facilitatorsData, userData] = await Promise.all([
          fetch("/api/osi-list").then((res) => res.json()),
          getFacilitatorsForDropdown(),
          getCurrentUser(),
        ]);

        if (osisData) setOsis(osisData);
        if (facilitatorsData) setFacilitators(facilitatorsData);
        if (userData) {
          setFormData((prev) => ({
            ...prev,
            solicitante: userData.nombre_apellido || "",
            gerencia_solicitante: userData.departamentos?.nombre || "SERVICIOS",
          }));
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

  const handleOSISelect = (osi: OSIFullData) => {
    setFormData((prev) => ({
      ...prev,
      selectedOSI: osi,
      costo_traslado: osi.costo_traslado || 0,
      impresion_total: osi.costo_impresion_material || 0,
      honorarios_horas: osi.horas_honorarios_instructor || 0,
      honorarios_costo_hora: osi.tarifa_hora_honorarios || 0,
      honorarios_total: (osi.horas_honorarios_instructor || 0) * (osi.tarifa_hora_honorarios || 0),
    }));
    setIsDropdownOpen(false);
    setSearchTerm("");
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
      banco: mainBank?.banco || "",
      nro_cuenta: mainBank?.nro_cuenta || "",
    }));
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

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto pb-10">
      <Card className="shadow-md border-gray-300">
        <CardContent className="p-0">
          {/* Header section mimicking the image */}
          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Corresponde a:
            </div>
            <div className="col-span-4 p-3 border-r border-gray-300">
              <Input 
                value={formData.corresponde_a} 
                onChange={(e) => setFormData(p => ({...p, corresponde_a: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0 font-medium"
              />
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Fecha de solicitud:
            </div>
            <div className="col-span-3 p-3">
              <Input 
                type="date"
                value={formData.fecha_solicitud}
                onChange={(e) => setFormData(p => ({...p, fecha_solicitud: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Tipo de solicitud:
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 flex gap-4 items-center">
              <RadioGroup 
                value={formData.tipo_solicitud} 
                onValueChange={(v: any) => setFormData(p => ({...p, tipo_solicitud: v}))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Interno" id="interno" />
                  <Label htmlFor="interno" className="text-xs">Interno</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Externo" id="externo" />
                  <Label htmlFor="externo" className="text-xs">Externo</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              Nro de Correlativo:
            </div>
            <div className="col-span-5 p-3 flex items-center">
              <span className="text-sm font-medium mr-2">{formData.nro_correlativo}</span>
              <Input 
                className="h-8 border-none focus-visible:ring-0 px-0 flex-1"
                placeholder="Continuación del correlativo..."
                // Logic for correlativo suffix could be added here if needed
              />
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Tipo de servicio:</span>
            </div>
            <div className="col-span-4 p-3 border-r border-gray-300 flex gap-4 items-center">
              <RadioGroup 
                value={formData.tipo_servicio} 
                onValueChange={(v: any) => setFormData(p => ({...p, tipo_servicio: v}))}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Servicio Técnico" id="st" />
                  <Label htmlFor="st" className="text-xs">Servicio Técnico</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Capacitación" id="cap" />
                  <Label htmlFor="cap" className="text-xs">Capacitación</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex items-center font-bold text-sm">
              N° OSI:
            </div>
            <div className="col-span-3 p-3 relative">
               <Input 
                  placeholder="Buscar OSI..."
                  value={searchTerm || (formData.selectedOSI?.nro_osi || "")}
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
                        onClick={() => handleOSISelect(osi)}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-xs"
                      >
                        <div className="font-bold">{osi.nro_osi}</div>
                        <div className="text-gray-600 truncate">{osi.servicio}</div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <div className="grid grid-cols-12 border-b border-gray-300">
            <div className="col-span-3 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm">Gerencia solicitante:</span>
            </div>
            <div className="col-span-4 p-3 border-r border-gray-300">
              <Input 
                value={formData.gerencia_solicitante}
                onChange={(e) => setFormData(p => ({...p, gerencia_solicitante: e.target.value}))}
                className="h-8 border-none focus-visible:ring-0 px-0 text-sm font-medium uppercase"
              />
            </div>
            <div className="col-span-2 p-3 border-r border-gray-300 bg-gray-50 flex flex-col justify-center">
              <span className="font-bold text-sm leading-tight text-center">Nombre del solicitante:</span>
            </div>
            <div className="col-span-3 p-3 flex items-center">
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
                className="flex gap-8"
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
                <th className="p-2 border-r border-gray-300 w-12">CANT</th>
                <th className="p-2 border-r border-gray-300 w-16">UNIDAD/ CONCEPTO</th>
                <th className="p-2 border-r border-gray-300">DESCRIPCIÓN</th>
                <th className="p-2 w-32">Verificación<br/>Listo / Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {/* Item 1: Traslado */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">1</td>
                <td className="p-2 text-center border-r border-gray-300">
                  <Input type="number" className="h-6 w-10 mx-auto text-center border-gray-300 p-1" defaultValue={1} />
                </td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">T</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={formData.dias_traslado || ""} 
                      onChange={(e) => setFormData(p => ({...p, dias_traslado: parseInt(e.target.value) || 0}))}
                      className="h-6 w-12 border-gray-300 p-1" 
                    />
                    <span>DÍAS DE TRASL. COSTO X C/U</span>
                    <span className="font-bold ml-2">${formData.costo_traslado}</span>
                    <span className="font-bold ml-auto">TOTAL ${(formData.dias_traslado || 0) * (formData.costo_traslado || 0)}</span>
                  </div>
                </td>
                <td className="p-2"></td>
              </tr>
              {/* Item 2: Impresión */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">2</td>
                <td className="p-2 text-center border-r border-gray-300">
                  <Input type="number" className="h-6 w-10 mx-auto text-center border-gray-300 p-1" defaultValue={1} />
                </td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">I</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase">IMPRESIÓN TOTAL</span>
                    <span className="font-bold ml-auto">${formData.impresion_total}</span>
                  </div>
                </td>
                <td className="p-2"></td>
              </tr>
              {/* Item 3: Honorarios */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">3</td>
                <td className="p-2 text-center border-r border-gray-300">
                  <Input type="number" className="h-6 w-10 mx-auto text-center border-gray-300 p-1" defaultValue={1} />
                </td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase">H</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span>HONORARIOS</span>
                    <Input 
                      type="number" 
                      value={formData.honorarios_horas || ""} 
                      onChange={(e) => {
                        const h = parseFloat(e.target.value) || 0;
                        setFormData(p => ({...p, honorarios_horas: h, honorarios_total: h * p.honorarios_costo_hora}))
                      }}
                      className="h-6 w-12 border-gray-300 p-1" 
                    />
                    <span>HORAS POR</span>
                    <span className="font-bold ml-2">${formData.honorarios_costo_hora}</span>
                    <span className="font-bold ml-auto">TOTAL ${formData.honorarios_total}</span>
                  </div>
                </td>
                <td className="p-2"></td>
              </tr>
              {/* Item 4: Informe Final */}
              <tr className="border-b border-gray-300">
                <td className="p-2 text-center border-r border-gray-300 font-bold">4</td>
                <td className="p-2 text-center border-r border-gray-300">
                  <Input type="number" className="h-6 w-10 mx-auto text-center border-gray-300 p-1" defaultValue={1} />
                </td>
                <td className="p-2 text-center border-r border-gray-300 font-bold uppercase whitespace-nowrap">IF</td>
                <td className="p-2 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="uppercase">INFORME FINAL</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span>$</span>
                      <Input 
                        type="number" 
                        value={formData.informe_final_total || ""} 
                        onChange={(e) => setFormData(p => ({...p, informe_final_total: parseFloat(e.target.value) || 0}))}
                        className="h-6 w-20 border-gray-300 p-1" 
                        placeholder="0.00"
                      />
                      <span>TOTAL $</span>
                      <span className="font-bold w-12 text-right">{formData.informe_final_total}</span>
                    </div>
                  </div>
                </td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>

          {/* Observations and Facilitator section */}
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

          <div className="grid grid-cols-12 text-xs h-10">
            <div className="col-span-1 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Banco
            </div>
            <div className="col-span-6 p-2 border-r border-gray-300 flex items-center font-bold uppercase">
              {formData.banco || "-"}
            </div>
            <div className="col-span-2 p-2 border-r border-gray-300 bg-gray-50 flex items-center font-bold">
              Nro Cuenta.
            </div>
            <div className="col-span-3 p-2 flex items-center font-bold">
              {formData.nro_cuenta || "-"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end gap-4">
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
          loading={isLoading}
          className="bg-blue-700 hover:bg-blue-800 text-white min-w-[150px]"
        >
          {isLoading ? "Guardando..." : "Guardar Registro"}
        </Button>
      </div>
    </form>
  );
}
