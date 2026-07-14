"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  getClienteCompanies,
  getClienteCredentials,
  createClienteCredentials,
  deleteClienteCredentials,
  updateClienteCredentials,
} from "@/app/actions/cliente-portal";
import type { ClienteCredential } from "@/types";

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

  // New credential form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

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

  const loadCredentials = useCallback(async (empresaId: number) => {
    setLoadingCreds(true);
    setError(null);
    setSuccess(null);
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
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Credencial creada exitosamente");
      setNewUsername("");
      setNewPassword("");
      setNewDisplayName("");
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
      loadCredentials(selectedCompanyId);
    }
  };

  const handleDelete = async (credId: number) => {
    if (!confirm("¿Eliminar esta credencial permanentemente?")) return;

    const result = await deleteClienteCredentials(credId);
    if (result.error) {
      setError(result.error);
    } else if (selectedCompanyId) {
      loadCredentials(selectedCompanyId);
    }
  };

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
            onClick={onClose}
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
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          placeholder="Buscar empresa..."
                          className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    </div>
                    {filteredCompanies.length === 0 ? (
                      <p className="p-3 text-sm text-gray-500 text-center">
                        No se encontraron empresas
                      </p>
                    ) : (
                      filteredCompanies.map((company) => (
                        <div
                          key={company.id}
                          onClick={() => handleSelectCompany(company.id)}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0"
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
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-md flex items-start gap-2 text-green-700 text-sm">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{success}</span>
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};
