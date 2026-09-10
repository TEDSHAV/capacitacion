"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  X,
  Mail,
  Eye,
} from "lucide-react";
import {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplateInput,
} from "@/app/actions/email-templates";
import { renderTemplateBoth } from "@/lib/email/template-render";
import type { EmailTemplateListItem } from "@/types/email";

const EVENT_TYPES = [
  { value: "asignacion_facilitador", label: "Asignación de Facilitador" },
];

export default function PlantillasEmailClient() {
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Editor state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmailTemplateInput>({
    name: "",
    slug: "",
    event_type: "asignacion_facilitador",
    subject: "",
    body: "",
    is_default: false,
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmailTemplates();
      setTemplates(data);
    } catch {
      setError("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleNew = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      event_type: "asignacion_facilitador",
      subject: "",
      body: "",
      is_default: false,
      is_active: true,
    });
    setFormError(null);
    setShowPreview(false);
    setShowEditor(true);
  };

  const handleEdit = async (id: number) => {
    setEditingId(id);
    setFormError(null);
    setShowPreview(false);
    setShowEditor(true);
    setSaving(true);
    try {
      const res = await getEmailTemplate(id);
      if (res.error || !res.data) {
        setFormError(res.error || "Plantilla no encontrada");
      } else {
        setForm({
          name: res.data.name,
          slug: res.data.slug,
          event_type: res.data.event_type,
          subject: res.data.subject,
          body: res.data.body,
          is_default: res.data.is_default,
          is_active: res.data.is_active,
        });
      }
    } catch {
      setFormError("Error al cargar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.name?.trim() || !form.subject?.trim() || !form.body?.trim()) {
      setFormError("Nombre, asunto y cuerpo son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const res =
        editingId != null
          ? await updateEmailTemplate(editingId, form)
          : await createEmailTemplate(form);
      if (res.error) {
        setFormError(res.error);
      } else {
        setSuccess(
          editingId != null
            ? "Plantilla actualizada exitosamente"
            : "Plantilla creada exitosamente",
        );
        setShowEditor(false);
        await loadTemplates();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch {
      setFormError("Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la plantilla "${name}"? Esta acción no se puede deshacer.`)) return;
    const res = await deleteEmailTemplate(id);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccess("Plantilla eliminada");
      await loadTemplates();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleToggleDefault = async (id: number, current: boolean) => {
    const res = await updateEmailTemplate(id, { is_default: !current });
    if (res.error) {
      setError(res.error);
    } else {
      await loadTemplates();
    }
  };

  const handleToggleActive = async (id: number, current: boolean) => {
    const res = await updateEmailTemplate(id, { is_active: !current });
    if (res.error) {
      setError(res.error);
    } else {
      await loadTemplates();
    }
  };

  // Preview with sample data
  const previewContext = {
    facilitador_nombre: "Juan Pérez",
    nro_osi: "OSI-2026-001",
    curso: "Curso de Prueba",
    empresa: "Empresa Demo C.A.",
    fechas: "15/09/2026, 16/09/2026",
    horario: "08:00 a 17:00",
    duracion: "8",
    direccion: "Av. Principal, Edificio Centro, Caracas",
    contacto: "María González",
    contacto_telefono: "+58 212-555-0000",
    observaciones: "Observaciones de ejemplo",
  };

  const preview = showPreview
    ? renderTemplateBoth(form.subject, form.body, previewContext)
    : null;

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-white min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-teal-600" />
            Plantillas de Email
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Gestiona las plantillas de correo para asignaciones y otros eventos.
          </p>
        </div>
        <Button onClick={handleNew} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva plantilla
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-md flex items-start gap-2 text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm text-gray-500 mt-2">Cargando plantillas...</p>
        </div>
      ) : templates.length === 0 && !showEditor ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay plantillas
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-4">
            Crea tu primera plantilla de email para usarla al asignar facilitadores.
          </p>
          <Button onClick={handleNew} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Crear plantilla
          </Button>
        </div>
      ) : (
        <>
          {/* Templates list */}
          {!showEditor && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Evento
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Default
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Activa
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {templates.map((t) => {
                    const eventLabel =
                      EVENT_TYPES.find((e) => e.value === t.event_type)?.label ||
                      t.event_type;
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{t.name}</div>
                          <div className="text-xs text-gray-500">{t.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{eventLabel}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleDefault(t.id, t.is_default)}
                            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            title={t.is_default ? "Quitar default" : "Marcar como default"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                t.is_default
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(t.id, t.is_active)}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              t.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                            title={t.is_active ? "Desactivar" : "Activar"}
                          >
                            {t.is_active ? "Activa" : "Inactiva"}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEdit(t.id)}
                            className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
                            className="inline-flex items-center p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors ml-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Editor */}
          {showEditor && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId != null ? "Editar plantilla" : "Nueva plantilla"}
                </h3>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowEditor(false);
                    setEditingId(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Asignación de Facilitador"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Slug (opcional, se autogenera)
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="asignacion-facilitador"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Tipo de evento
                </label>
                <select
                  value={form.event_type}
                  onChange={(e) =>
                    setForm({ ...form, event_type: e.target.value })
                  }
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {EVENT_TYPES.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Asunto *
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="🚀 ¡Nueva Asignación Confirmada! — OSI {{nro_osi}}"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">
                    Cuerpo *
                  </label>
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <Eye className="w-3 h-3" />
                    {showPreview ? "Ocultar vista previa" : "Vista previa"}
                  </button>
                </div>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="font-mono text-xs min-h-[360px] whitespace-pre-wrap"
                  placeholder="Cuerpo del correo con {{placeholders}}..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  Placeholders disponibles:{" "}
                  <code className="text-gray-600">
                    {"{{facilitador_nombre}} {{curso}} {{empresa}} {{nro_osi}} {{fechas}} {{horario}} {{duracion}} {{direccion}} {{contacto}} {{contacto_telefono}} {{observaciones}}"}
                  </code>
                </p>
              </div>

              {showPreview && preview && (
                <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Vista previa
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {preview.subject}
                  </div>
                  <div className="text-xs text-gray-700 whitespace-pre-wrap border-t border-gray-200 pt-2">
                    {preview.body}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_default}
                    onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                    className="rounded"
                  />
                  Plantilla por defecto
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded"
                  />
                  Activa
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-teal-600 hover:bg-teal-700 flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditor(false);
                    setEditingId(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
