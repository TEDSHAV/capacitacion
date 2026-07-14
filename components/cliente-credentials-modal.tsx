"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Plus,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  Power,
  Search,
  Copy,
  Check,
  MapPin,
  ImagePlus,
  Upload,
} from "lucide-react";
import {
  getClienteCompanies,
  getClienteCredentials,
  createClienteCredentials,
  deleteClienteCredentials,
  updateClienteCredentials,
  getEmpresaLogoAction,
  uploadEmpresaLogoAction,
  removeEmpresaLogoAction,
} from "@/app/actions/cliente-portal";
import { getCompaniesAndCities } from "@/app/actions/companies-cities";
import { getSedesByEmpresaAction, type Sede } from "@/app/actions/sedes";
import { compressImage } from "@/lib/image-compression";
import type { ClienteCredential } from "@/types";
import type { City } from "@/app/actions/companies-cities";

interface ClienteCredentialsModalProps {
  onClose: () => void;
}

export const ClienteCredentialsModal = ({
  onClose,
}: ClienteCredentialsModalProps) => {
  const [companies, setCompanies] = useState<
    { id: number; razon_social: string; rif: string; es_cliente: boolean }[]
  >([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    null,
  );
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [credentials, setCredentials] = useState<ClienteCredential[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState("");
  const [savedUsername, setSavedUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // New credential form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newSedeId, setNewSedeId] = useState<number | null>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [isLoadingSedes, setIsLoadingSedes] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadCompanies() {
      setLoadingCompanies(true);
      const { data, error } = await getClienteCompanies();
      if (error) {
        setError(error);
      } else if (data) {
        setCompanies(data);
      }
      setLoadingCompanies(false);
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    async function loadCities() {
      const result = await getCompaniesAndCities();
      if (result.success && result.cities) {
        setCities(result.cities);
      }
    }
    loadCities();
  }, []);

  // Fetch sedes when a company is selected
  useEffect(() => {
    const fetchSedes = async () => {
      if (selectedCompanyId) {
        setIsLoadingSedes(true);
        try {
          const result = await getSedesByEmpresaAction(selectedCompanyId);
          if (result.data) {
            setSedes(result.data);
          } else {
            setSedes([]);
          }
        } catch (error) {
          console.error("Error fetching sedes:", error);
          setSedes([]);
        } finally {
          setIsLoadingSedes(false);
        }
      } else {
        setSedes([]);
      }
      setNewSedeId(null);
    };
    fetchSedes();
  }, [selectedCompanyId]);

  // Fetch logo when a company is selected
  useEffect(() => {
    const fetchLogo = async () => {
      if (selectedCompanyId) {
        try {
          const result = await getEmpresaLogoAction(selectedCompanyId);
          setLogoUrl(result.data?.logo_url || null);
        } catch (error) {
          console.error("Error fetching logo:", error);
          setLogoUrl(null);
        }
      } else {
        setLogoUrl(null);
      }
    };
    fetchLogo();
  }, [selectedCompanyId]);

  useEffect(() => {
    if (highlightedIndex < 0 || !dropdownRef.current) return;
    const container = dropdownRef.current;
    const items = container.querySelectorAll("[data-company-item]");
    const item = items[highlightedIndex] as HTMLElement | undefined;
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    if (showCompanyDropdown && dropdownRef.current) {
      dropdownRef.current.focus();
    }
  }, [showCompanyDropdown]);

  const loadCredentials = useCallback(async (empresaId: number) => {
    setLoadingCreds(true);
    setError(null);
    const { data, error } = await getClienteCredentials(empresaId);
    if (error) {
      setError(error);
    } else {
      setCredentials(data || []);
    }
    setLoadingCreds(false);
  }, []);

  const handleSelectCompany = (companyId: number) => {
    setSelectedCompanyId(companyId);
    setShowCompanyDropdown(false);
    setCompanySearch("");
    setHighlightedIndex(-1);
    setSuccess(null);
    setSavedPassword("");
    loadCredentials(companyId);
  };

  const handleCreateCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanyId) return;
    if (!newUsername || !newPassword) {
      setError("Usuario y contraseña son requeridos");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createClienteCredentials(
      selectedCompanyId,
      newUsername,
      newPassword,
      newDisplayName || undefined,
      undefined,
      newSedeId || undefined,
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSavedUsername(newUsername);
      setSavedPassword(newPassword);
      setSuccess("Credencial creada exitosamente");
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
      setNewSedeId(null);
      setCopied(false);
      loadCredentials(selectedCompanyId);
    }
    setSaving(false);
  };

  const handleToggleActive = async (cred: ClienteCredential) => {
    const result = await updateClienteCredentials(cred.id, {
      is_active: !cred.is_active,
    });
    if (result.error) {
      setError(result.error);
    } else if (selectedCompanyId) {
      setSuccess(null);
      setSavedPassword("");
      loadCredentials(selectedCompanyId);
    }
  };

  const handleDelete = async (credId: number) => {
    if (!confirm("¿Eliminar esta credencial permanentemente?")) return;

    const result = await deleteClienteCredentials(credId);
    if (result.error) {
      setError(result.error);
    } else if (selectedCompanyId) {
      setSuccess(null);
      setSavedPassword("");
      loadCredentials(selectedCompanyId);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showCompanyDropdown) {
        setSavedPassword("");
        setCopied(false);
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showCompanyDropdown, onClose]);

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const filteredCompanies = companySearch
    ? companies.filter((c) =>
        c.razon_social.toLowerCase().includes(companySearch.toLowerCase()),
      )
    : companies;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-8 max-w-4xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Credenciales del Portal de Clientes
            </h3>
          </div>
          <button
            onClick={() => {
              setSavedPassword("");
              setCopied(false);
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingCompanies ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Cargando empresas...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Selector */}
            <div className="space-y-2">
              <Label>Empresa Cliente</Label>
              <div className="relative">
                <div
                  onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between transition-colors hover:border-gray-400 bg-white"
                >
                  <span
                    className={`truncate ${!selectedCompany ? "text-gray-400" : "text-gray-900"}`}
                  >
                    {selectedCompany
                      ? `${selectedCompany.razon_social} (${selectedCompany.rif})`
                      : "Seleccionar empresa..."}
                  </span>
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>

                {showCompanyDropdown && (
                  <div
                    ref={dropdownRef}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev < filteredCompanies.length - 1 ? prev + 1 : 0,
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightedIndex((prev) =>
                          prev > 0 ? prev - 1 : filteredCompanies.length - 1,
                        );
                      } else if (e.key === "Enter" && highlightedIndex >= 0) {
                        e.preventDefault();
                        handleSelectCompany(filteredCompanies[highlightedIndex].id);
                      } else if (e.key === "Escape") {
                        setShowCompanyDropdown(false);
                      }
                    }}
                    className="mt-1 w-full bg-white border border-gray-200 rounded-md shadow-md max-h-80 overflow-y-auto focus:outline-none"
                  >
                    <div className="p-2 border-b border-gray-100 bg-white">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          value={companySearch}
                          onChange={(e) => {
                            setCompanySearch(e.target.value);
                            setHighlightedIndex(-1);
                          }}
                          placeholder="Buscar empresa..."
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    {filteredCompanies.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500 text-center">
                        No se encontraron empresas
                      </p>
                    ) : (
                      filteredCompanies.map((company, index) => (
                        <div
                          key={company.id}
                          data-company-item
                          onClick={() => handleSelectCompany(company.id)}
                          className={`px-3 py-2.5 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors ${
                            index === highlightedIndex
                              ? "bg-blue-100 ring-1 ring-inset ring-blue-300"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <p className="font-medium text-gray-900">
                            {company.razon_social}
                          </p>
                          <p className="text-xs text-gray-500">{company.rif}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedCompanyId && (
              <>
                {/* Company Logo Section */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo de la empresa"
                      className="w-12 h-12 rounded-lg object-contain ring-1 ring-gray-200 bg-white p-1 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white ring-1 ring-gray-200 flex items-center justify-center shadow-sm">
                      <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">Logo de la empresa</p>
                    <p className="text-xs text-gray-400">Se mostrará en el portal del cliente al iniciar sesión</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedCompanyId) return;
                        setIsUploadingLogo(true);
                        setError(null);
                        try {
                          const compressed = await compressImage(file, 200, 0.8);
                          const result = await uploadEmpresaLogoAction(selectedCompanyId, compressed);
                          if (result.error) {
                            setError(result.error);
                          } else if (result.logoUrl) {
                            setLogoUrl(result.logoUrl);
                            setSuccess("Logo actualizado exitosamente");
                          }
                        } catch (err) {
                          setError("Error al procesar la imagen");
                        } finally {
                          setIsUploadingLogo(false);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : logoUrl ? (
                        <Upload className="w-3.5 h-3.5" />
                      ) : (
                        <ImagePlus className="w-3.5 h-3.5" />
                      )}
                      {logoUrl ? "Cambiar" : "Subir logo"}
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedCompanyId) return;
                          setIsRemovingLogo(true);
                          setError(null);
                          try {
                            const result = await removeEmpresaLogoAction(selectedCompanyId);
                            if (result.error) {
                              setError(result.error);
                            } else {
                              setLogoUrl(null);
                              setSuccess("Logo eliminado");
                            }
                          } catch (err) {
                            setError("Error al eliminar el logo");
                          } finally {
                            setIsRemovingLogo(false);
                          }
                        }}
                        disabled={isRemovingLogo}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {isRemovingLogo ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {/* Credentials List */}
                {loadingCreds ? (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    <p className="text-sm text-gray-500 mt-2">
                      Cargando credenciales...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">
                      Credenciales Existentes ({credentials.length})
                    </h4>
                    {credentials.length === 0 ? (
                      <p className="text-sm text-gray-500 py-3 text-center bg-gray-50 rounded-lg">
                        No hay credenciales creadas para esta empresa.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {credentials.map((cred) => (
                          <div
                            key={cred.id}
                            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50/50"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  {cred.username}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    cred.is_active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                >
                                  {cred.is_active ? "Activo" : "Inactivo"}
                                </span>
                              </div>
                              {cred.display_name && (
                                <p className="text-xs text-gray-500">
                                  {cred.display_name}
                                </p>
                              )}
                              {cred.id_sede && (
                                <p className="text-xs text-blue-600 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {sedes.find((s) => s.id === cred.id_sede)?.nombre_sede || `Sede #${cred.id_sede}`}
                                </p>
                              )}
                              {!cred.id_sede && cred.id_ciudad && (
                                <p className="text-xs text-blue-600 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {cities.find((c) => c.id === cred.id_ciudad)?.nombre_ciudad || `Ciudad #${cred.id_ciudad}`}
                                </p>
                              )}
                              {!cred.id_sede && !cred.id_ciudad && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  Todas las sedes
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleActive(cred)}
                                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                                title={
                                  cred.is_active
                                    ? "Desactivar"
                                    : "Activar"
                                }
                              >
                                <Power
                                  className={`w-4 h-4 ${cred.is_active ? "text-green-600" : "text-gray-400"}`}
                                />
                              </button>
                              <button
                                onClick={() => handleDelete(cred.id)}
                                className="p-1.5 rounded-md hover:bg-red-100 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Create New Credential Form */}
                <form
                  onSubmit={handleCreateCredential}
                  className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50/30"
                >
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Credencial
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-username" className="text-xs">
                        Nombre de Usuario
                      </Label>
                      <Input
                        id="new-username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="ej: coca.cola.maracaibo"
                        autoComplete="off"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-display-name" className="text-xs">
                        Nombre para Mostrar (opcional)
                      </Label>
                      <Input
                        id="new-display-name"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="ej: Departamento de RRHH"
                        autoComplete="off"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-password" className="text-xs">
                        Contraseña
                      </Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="new-sede" className="text-xs">
                        Sede (opcional)
                      </Label>
                      <select
                        id="new-sede"
                        value={newSedeId || ""}
                        onChange={(e) => setNewSedeId(e.target.value ? Number(e.target.value) : null)}
                        disabled={!selectedCompanyId || isLoadingSedes}
                        className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Todas las sedes (empresa completa)</option>
                        {sedes.map((sede) => (
                          <option key={sede.id} value={sede.id}>
                            {sede.nombre_sede}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400">
                        Si seleccionas una sede, esta credencial solo verá certificados de esa sede.
                      </p>
                      {isLoadingSedes && (
                        <p className="text-xs text-gray-400">Cargando sedes...</p>
                      )}
                      {selectedCompanyId && !isLoadingSedes && sedes.length === 0 && (
                        <p className="text-xs text-gray-400">Esta empresa no tiene sedes registradas</p>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-100 rounded-md flex items-start gap-2 text-green-700 text-sm">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{success}</span>
                      </div>
                      {savedPassword && (
                        <button
                          type="button"
                          onClick={async () => {
                            const text = `Usuario: ${savedUsername}\nContraseña: ${savedPassword}\nURL: https://capacitacion.shadevenezuela.com.ve/portal/cliente/login`;
                            await navigator.clipboard.writeText(text);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              ¡Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copiar credenciales
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full"
                    size="sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Credencial
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setSavedPassword("");
              setCopied(false);
              onClose();
            }}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
