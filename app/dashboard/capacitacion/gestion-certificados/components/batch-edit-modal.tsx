"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BatchUpdateData } from "@/types";
import {
  batchUpdateCertificatesAction,
  getOSIsWithCertificatesAction,
  getBatchCertificateDetailsAction,
  getFacilitatorsForFilters,
} from "@/app/actions/certificados";
import { Loader2, X, AlertCircle, Info, Search, ChevronDown, Check } from "lucide-react";

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialOsi?: string;
}

interface OSILookup {
  nro_osi: number;
  id_curso: number;
  company_name: string;
  course_name: string;
}

interface FacilitatorLookup {
  id: number;
  nombre_apellido: string;
}

export function BatchEditModal({
  isOpen,
  onClose,
  onSuccess,
  initialOsi = "",
}: BatchEditModalProps) {
  const [osiNumber, setOsiNumber] = useState(initialOsi);
  const [loading, setLoading] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [osis, setOsis] = useState<OSILookup[]>([]);
  const [loadingOsis, setLoadingOsis] = useState(false);
  const [osiSearchTerm, setOsiSearchTerm] = useState("");
  const [isOsiDropdownOpen, setIsOsiDropdownOpen] = useState(false);
  const [selectedOsiData, setSelectedOsiData] = useState<OSILookup | null>(null);
  const [facilitators, setFacilitators] = useState<FacilitatorLookup[]>([]);
  const [facilitatorSearchTerm, setFacilitatorSearchTerm] = useState("");
  const [isFacilitatorDropdownOpen, setIsFacilitatorDropdownOpen] = useState(false);
  const [selectedFacilitator, setSelectedFacilitator] = useState<FacilitatorLookup | null>(null);

  const [updates, setUpdates] = useState<BatchUpdateData>({
    certificate_title: "",
    certificate_subtitle: "",
    date: "",
    fecha_vencimiento: "",
    location: "",
    horas_estimadas: "",
    id_facilitador: "",
  });

  // Load OSIs on mount
  useEffect(() => {
    if (isOpen) {
      const loadOsis = async () => {
        try {
          setLoadingOsis(true);
          const data = await getOSIsWithCertificatesAction();
          setOsis(data);
          
          // If initial OSI is provided, find and select it
          if (initialOsi) {
            setOsiSearchTerm(initialOsi); // Set search term to show all courses for this OSI
            const numericInitial = parseInt(initialOsi.replace(/[^\d]/g, ""));
            const found = data.find(o => o.nro_osi === numericInitial);
            if (found) {
              setSelectedOsiData(found);
              handleOsiSelect(found);
            }
          }
        } catch (error) {
          console.error("Error loading OSIs:", error);
        } finally {
          setLoadingOsis(false);
        }
      };
      loadOsis();

      // Load facilitators
      (async () => {
        try {
          const facilitatorData = await getFacilitatorsForFilters();
          setFacilitators(facilitatorData);
        } catch (error) {
          console.error("Error loading facilitators:", error);
        }
      })();
    }
  }, [isOpen, initialOsi]);

  // Load details when OSI is selected
  const handleOsiSelect = async (osi: OSILookup) => {
    setSelectedOsiData(osi);
    setOsiNumber(osi.nro_osi.toString());
    setIsOsiDropdownOpen(false);
    
    try {
      setLoadingDetails(true);
      const result = await getBatchCertificateDetailsAction(osi.nro_osi, osi.id_curso);
      if (result.success && result.data) {
        const facilitatorId = result.data.id_facilitador || "";
        const foundFacilitator = facilitatorId
          ? facilitators.find(f => f.id.toString() === facilitatorId)
          : null;
        setSelectedFacilitator(foundFacilitator || null);
        setUpdates({
          certificate_title: result.data.certificate_title || "",
          certificate_subtitle: result.data.certificate_subtitle || "",
          date: result.data.date || "",
          fecha_vencimiento: result.data.fecha_vencimiento || "",
          location: result.data.location || "",
          horas_estimadas: result.data.horas_estimadas || "",
          id_facilitador: facilitatorId,
        });
      }
    } catch (error) {
      console.error("Error loading batch details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredOsis = useMemo(() => {
    if (!osiSearchTerm.trim()) return osis.slice(0, 100);
    const term = osiSearchTerm.toLowerCase();
    return osis.filter(o => 
      o.nro_osi.toString().includes(term) || 
      o.company_name.toLowerCase().includes(term) || 
      o.course_name.toLowerCase().includes(term)
    ).slice(0, 100);
  }, [osis, osiSearchTerm]);

  const filteredFacilitators = useMemo(() => {
    if (!facilitatorSearchTerm.trim()) return facilitators.slice(0, 50);
    const term = facilitatorSearchTerm.toLowerCase();
    return facilitators.filter(f =>
      f.id.toString().includes(term) ||
      f.nombre_apellido.toLowerCase().includes(term)
    ).slice(0, 50);
  }, [facilitators, facilitatorSearchTerm]);

  const handleFacilitatorSelect = (facilitator: FacilitatorLookup) => {
    setSelectedFacilitator(facilitator);
    handleUpdateChange("id_facilitador", facilitator.id.toString());
    setIsFacilitatorDropdownOpen(false);
    setFacilitatorSearchTerm("");
  };

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Sync selectedFacilitator when facilitators list loads after id_facilitador is set
  useEffect(() => {
    if (updates.id_facilitador && facilitators.length > 0 && !selectedFacilitator) {
      const found = facilitators.find(f => f.id.toString() === updates.id_facilitador);
      if (found) setSelectedFacilitator(found);
    }
  }, [facilitators, updates.id_facilitador, selectedFacilitator]);

  const handleUpdateChange = (field: keyof BatchUpdateData, value: string) => {
    setUpdates((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericOsi = parseInt(osiNumber.replace(/[^\d]/g, ""));
    if (isNaN(numericOsi) || !selectedOsiData) {
      alert("Por favor seleccione un número de OSI válido");
      return;
    }

    // Since fields are pre-populated, we send everything in state.
    // The user can edit whatever they want.
    try {
      setLoading(true);
      const result = await batchUpdateCertificatesAction(numericOsi, updates, selectedOsiData.id_curso);
      
      if (result.success) {
        alert(result.message);
        onSuccess();
        onClose();
        // Reset form
        setUpdates({
          certificate_title: "",
          certificate_subtitle: "",
          date: "",
          fecha_vencimiento: "",
          location: "",
          horas_estimadas: "",
          id_facilitador: "",
        });
        setSelectedOsiData(null);
        setSelectedFacilitator(null);
        setOsiNumber("");
        setOsiSearchTerm("");
        setFacilitatorSearchTerm("");
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Batch update error:", error);
      alert("Ocurrió un error inesperado al actualizar el lote.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-all">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Edición por Lote (OSI)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <form id="batch-edit-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 relative">
              <Label className="text-sm font-semibold text-gray-700">
                Seleccionar OSI
              </Label>
              <div 
                className={`w-full px-4 h-12 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                  isOsiDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
                } ${loadingOsis ? "bg-gray-50 opacity-70 cursor-not-allowed" : "bg-white"}`}
                onClick={() => !loadingOsis && setIsOsiDropdownOpen(!isOsiDropdownOpen)}
              >
                <div className="flex flex-col truncate">
                  {selectedOsiData ? (
                    <>
                      <span className="text-sm font-bold text-gray-900">OSI: {selectedOsiData.nro_osi}</span>
                      <span className="text-[10px] text-gray-500 truncate">{selectedOsiData.company_name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">Buscar por N° OSI o Empresa...</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loadingOsis ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOsiDropdownOpen ? "rotate-180" : ""}`} />
                  )}
                </div>
              </div>

              {isOsiDropdownOpen && (
                <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                    <Search className="h-4 w-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Escriba para filtrar..."
                      value={osiSearchTerm}
                      onChange={(e) => setOsiSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 h-6"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filteredOsis.length > 0 ? (
                      filteredOsis.map((osi) => (
                        <div
                          key={`${osi.nro_osi}-${osi.id_curso}`}
                          onClick={() => handleOsiSelect(osi)}
                          className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${
                            selectedOsiData?.nro_osi === osi.nro_osi && selectedOsiData?.id_curso === osi.id_curso ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className={`text-sm font-bold ${selectedOsiData?.nro_osi === osi.nro_osi && selectedOsiData?.id_curso === osi.id_curso ? "text-blue-700" : "text-gray-900"}`}>
                              OSI: {osi.nro_osi}
                            </span>
                            <span className="text-[11px] text-gray-600 truncate font-medium">{osi.course_name}</span>
                            <span className="text-[10px] text-gray-500 truncate">{osi.company_name}</span>
                          </div>
                          {selectedOsiData?.nro_osi === osi.nro_osi && selectedOsiData?.id_curso === osi.id_curso && (
                            <Check className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-gray-500 text-sm italic">
                        No se encontraron OSIs con certificados activos
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3" />
                Se actualizarán solo los certificados del curso seleccionado bajo esta OSI.
              </p>
            </div>
            
            <div className={`border-t border-gray-100 pt-6 space-y-5 transition-opacity duration-300 ${!selectedOsiData ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 flex items-center gap-3">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700 font-medium">
                  {loadingDetails ? "Cargando datos actuales..." : "Los campos se han pre-poblado con los valores actuales. Modifique solo lo necesario."}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                    Título del Curso
                  </Label>
                  <div className="relative">
                    <Input
                      id="title"
                      value={updates.certificate_title}
                      onChange={(e) => handleUpdateChange("certificate_title", e.target.value)}
                      className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Título que aparecerá en el certificado"
                      disabled={loading || loadingDetails}
                    />
                    {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-sm font-semibold text-gray-700">
                    Subtítulo
                  </Label>
                  <div className="relative">
                    <Input
                      id="subtitle"
                      value={updates.certificate_subtitle}
                      onChange={(e) => handleUpdateChange("certificate_subtitle", e.target.value)}
                      className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Subtítulo opcional"
                      disabled={loading || loadingDetails}
                    />
                    {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-semibold text-gray-700">
                      Fecha de Emisión
                    </Label>
                    <div className="relative">
                      <Input
                        id="date"
                        type="date"
                        value={updates.date}
                        onChange={(e) => handleUpdateChange("date", e.target.value)}
                        className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                        disabled={loading || loadingDetails}
                      />
                      {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="text-sm font-semibold text-gray-700">
                      Vencimiento
                    </Label>
                    <div className="relative">
                      <Input
                        id="expiry"
                        type="date"
                        value={updates.fecha_vencimiento}
                        onChange={(e) => handleUpdateChange("fecha_vencimiento", e.target.value)}
                        className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                        disabled={loading || loadingDetails}
                      />
                      {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-semibold text-gray-700">
                    Ciudad / Ubicación
                  </Label>
                  <div className="relative">
                    <Input
                      id="location"
                      value={updates.location}
                      onChange={(e) => handleUpdateChange("location", e.target.value)}
                      className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Ej: Puerto La Cruz, Anzoátegui"
                      disabled={loading || loadingDetails}
                    />
                    {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horas" className="text-sm font-semibold text-gray-700">
                      Número de Horas
                    </Label>
                    <div className="relative">
                      <Input
                        id="horas"
                        type="number"
                        value={updates.horas_estimadas}
                        onChange={(e) => handleUpdateChange("horas_estimadas", e.target.value)}
                        className="h-11 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="Ej: 8"
                        disabled={loading || loadingDetails}
                      />
                      {loadingDetails && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label className="text-sm font-semibold text-gray-700">
                      Facilitador
                    </Label>
                    <div
                      className={`w-full px-4 h-11 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isFacilitatorDropdownOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-200 hover:border-gray-300"
                      } ${loading || loadingDetails ? "bg-gray-50 opacity-70 cursor-not-allowed" : "bg-white"}`}
                      onClick={() => !(loading || loadingDetails) && setIsFacilitatorDropdownOpen(!isFacilitatorDropdownOpen)}
                    >
                      <div className="flex flex-col truncate">
                        {selectedFacilitator ? (
                          <span className="text-sm font-medium text-gray-900 truncate">{selectedFacilitator.nombre_apellido}</span>
                        ) : (
                          <span className="text-sm text-gray-400">Seleccionar...</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {loadingDetails ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isFacilitatorDropdownOpen ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </div>

                    {isFacilitatorDropdownOpen && (
                      <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
                          <Search className="h-4 w-4 text-gray-400 shrink-0" />
                          <input
                            type="text"
                            autoFocus
                            placeholder="Buscar facilitador..."
                            value={facilitatorSearchTerm}
                            onChange={(e) => setFacilitatorSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 h-6"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredFacilitators.length > 0 ? (
                            filteredFacilitators.map((facilitator) => (
                              <div
                                key={facilitator.id}
                                onClick={() => handleFacilitatorSelect(facilitator)}
                                className={`px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-blue-50 transition-colors ${
                                  updates.id_facilitador === facilitator.id.toString() ? "bg-blue-50" : ""
                                }`}
                              >
                                <span className={`text-sm font-medium ${updates.id_facilitador === facilitator.id.toString() ? "text-blue-700" : "text-gray-900"}`}>
                                  {facilitator.nombre_apellido}
                                </span>
                                {updates.id_facilitador === facilitator.id.toString() && (
                                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm italic">
                              No se encontraron facilitadores
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setUpdates({
                certificate_title: "",
                certificate_subtitle: "",
                date: "",
                fecha_vencimiento: "",
                location: "",
                horas_estimadas: "",
                id_facilitador: "",
              });
              setSelectedOsiData(null);
              setSelectedFacilitator(null);
              setOsiNumber("");
              setOsiSearchTerm("");
              setFacilitatorSearchTerm("");
              setIsOsiDropdownOpen(false);
              setIsFacilitatorDropdownOpen(false);
              onClose();
            }}
            className="flex-1 h-12 rounded-xl font-semibold border-gray-300 text-gray-700 hover:bg-white transition-all"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="batch-edit-form"
            className="flex-1 h-12 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all disabled:opacity-70 disabled:grayscale"
            disabled={loading || !selectedOsiData || loadingDetails}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Actualizando...</span>
              </div>
            ) : (
              "Actualizar Lote"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
