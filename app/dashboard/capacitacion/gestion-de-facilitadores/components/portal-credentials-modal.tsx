"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Save, Loader2, AlertCircle, CheckCircle2, Copy, Check, Trash2, ClipboardList } from "lucide-react";
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Acceso al Portal
            </h3>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setSavedPassword("");
              setCopied(false);
              onClose();
            }}
          >
            ✕
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Gestiona las credenciales de <strong>{facilitadorName}</strong> para que pueda ingresar al portal de facilitadores.
        </p>

        {/* Assigned OSIs Badges */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-sm font-semibold text-gray-700">
              OSIs Asignadas ({assignedOsis.length})
            </span>
          </div>
          {assignedOsis.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin OSIs asignadas a este facilitador</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedOsis.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-800 rounded-full border border-teal-200"
                  title={`${a.osi?.nombre_empresa || ""} — ${a.osi?.servicio || ""}`}
                >
                  {a.osi?.nro_osi || `OSI #${a.osi_id}`} — {a.osi?.nombre_empresa || "N/A"} — {a.osi?.servicio || "N/A"}
                </span>
              ))}
            </div>
          )}
        </div>

        {hasExistingCredentials && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-sm text-blue-700">
              Este facilitador ya tiene credenciales configuradas (usuario: <strong>{username}</strong>). Puede editarlas o eliminarlas.
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Cargando credenciales...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: juan.perez"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p className="text-xs text-gray-500">
                La contraseña se guardará de forma segura. Si el usuario ya existe, se actualizará su contraseña.
              </p>
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
                      const text = `Usuario: ${username}\nContraseña: ${savedPassword}\nURL: https://capacitacion.shadevenezuela.com.ve/portal/facilitador/login`;
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

            {hasExistingCredentials && (
              <div className="pt-4 border-t border-gray-200">
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setSavedPassword("");
                setCopied(false);
                onClose();
              }}>
                Cerrar
              </Button>
              <Button type="submit" disabled={saving}>
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
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
