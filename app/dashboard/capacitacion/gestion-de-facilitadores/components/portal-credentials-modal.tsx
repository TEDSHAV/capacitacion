"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Save, Loader2, AlertCircle, CheckCircle2, Copy, Check, Trash2, ClipboardList, X, User, Lock, ShieldCheck } from "lucide-react";
import { 
  getFacilitatorCredentials, 
  createFacilitatorCredentials,
  deleteFacilitatorCredentials
} from "@/app/actions/facilitador-portal";
import { getAssignmentsByFacilitador } from "@/app/actions/osi-facilitador-assignments";

interface PortalCredentialsModalProps {
  facilitadorId: number;
  facilitadorName: string;
  onClose: () => void;
}

export const PortalCredentialsModal = ({
  facilitadorId,
  facilitadorName,
  onClose,
}: PortalCredentialsModalProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedPassword, setSavedPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assignedOsis, setAssignedOsis] = useState<any[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSavedPassword("");
        setCopied(false);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [credsResult, osisResult] = await Promise.all([
        getFacilitatorCredentials(facilitadorId),
        getAssignmentsByFacilitador(facilitadorId),
      ]);
      if (credsResult.data) {
        setUsername(credsResult.data.username || "");
        setHasExistingCredentials(!!credsResult.data.username);
      }
      if (osisResult.data) {
        setAssignedOsis(osisResult.data);
      }
      setLoading(false);
    }
    load();
  }, [facilitadorId]);

  const handleDelete = async () => {
    if (!confirm("¿Está seguro de que desea eliminar permanentemente las credenciales de este facilitador? Esta acción no se puede deshacer.")) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    const result = await deleteFacilitatorCredentials(facilitadorId);
    if (result.error) {
      setError(result.error);
    } else {
      setHasExistingCredentials(false);
      setUsername("");
      setPassword("");
      setSavedPassword("");
      setSuccess("Credenciales eliminadas exitosamente");
      setTimeout(() => setSuccess(null), 3000);
    }
    setDeleting(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Usuario y contraseña son requeridos");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await createFacilitatorCredentials(
      facilitadorId,
      username,
      password
    );

    if (result.error) {
      setError(result.error);
    } else {
      setSavedPassword(password);
      setSuccess("Credenciales guardadas exitosamente");
      setPassword(""); // Clear password field for security
      setCopied(false);
    }
    setSaving(false);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200 p-4"
      onClick={() => {
        setSavedPassword("");
        setCopied(false);
        onClose();
      }}
    >
      <div
        className="bg-white rounded-xl max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-white px-6 pt-6 pb-5 border-b border-gray-100 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                Acceso al Portal
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {facilitadorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSavedPassword("");
              setCopied(false);
              onClose();
            }}
            className="shrink-0 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-lg p-1.5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Assigned OSIs section */}
          <section>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
              OSIs Asignadas
              <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-700">
                {assignedOsis.length}
              </span>
            </h4>
            {assignedOsis.length === 0 ? (
              <p className="text-xs text-gray-400 italic px-3 py-2 bg-gray-50 rounded-md border border-dashed border-gray-200">
                Sin OSIs asignadas a este facilitador
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedOsis.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-800 rounded-md border border-teal-200"
                    title={`${a.osi?.nombre_empresa || ""} — ${a.osi?.servicio || ""}`}
                  >
                    {a.osi?.nro_osi || `OSI #${a.osi_id}`} — {a.osi?.nombre_empresa || "N/A"} — {a.osi?.servicio || "N/A"}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Status banner */}
          {hasExistingCredentials && (
            <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span className="text-sm">
                Credenciales activas · usuario <strong className="font-semibold">{username}</strong>
              </span>
            </div>
          )}

          {/* Credentials form / loading */}
          {loading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-500 mt-3">Cargando credenciales...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Nombre de Usuario
                </Label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: juan.perez"
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  La contraseña se guardará de forma segura. Si el usuario ya existe, se actualizará su contraseña.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </div>
                  {savedPassword && (
                    <button
                      type="button"
                      onClick={async () => {
                        const text = `Usuario: ${username}\nContraseña: ${savedPassword}\nURL: https://capacitacion.shadevenezuela.com.ve/portal/facilitador/login`;
                        try {
                          if (navigator.clipboard && window.isSecureContext) {
                            await navigator.clipboard.writeText(text);
                          } else {
                            const textarea = document.createElement("textarea");
                            textarea.value = text;
                            textarea.style.position = "fixed";
                            textarea.style.opacity = "0";
                            document.body.appendChild(textarea);
                            textarea.focus();
                            textarea.select();
                            document.execCommand("copy");
                            document.body.removeChild(textarea);
                          }
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch (err) {
                          console.error("Failed to copy credentials:", err);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-green-700 text-sm font-medium rounded-lg border border-green-300 hover:bg-green-50 transition-colors"
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

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {hasExistingCredentials ? "Actualizar" : "Guardar"} Credenciales
                  </>
                )}
              </Button>

              {hasExistingCredentials && (
                <div className="pt-4 mt-2 border-t border-gray-200">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-red-600 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Zona de peligro
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar Credenciales
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
