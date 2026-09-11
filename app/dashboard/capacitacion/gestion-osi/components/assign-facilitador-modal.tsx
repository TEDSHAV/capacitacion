"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Mail,
  Send,
  Settings,
  Info,
  Paperclip,
  X,
} from "lucide-react";
import {
  getAssignmentByOSI,
  getActiveFacilitatorsForDropdown,
  assignOSIToFacilitador,
  unassignOSIToFacilitador,
} from "@/app/actions/osi-facilitador-assignments";
import { getOsiSessionCount } from "@/app/actions/surveys";
import { getOSIEmailContext } from "@/app/actions/osi-email-context";
import {
  getEmailTemplates,
  getDefaultEmailTemplate,
} from "@/app/actions/email-templates";
import { sendAssignmentEmail, isEmailServerConfigured } from "@/app/actions/email-send";
import { getEmailLogsForOSI } from "@/app/actions/email-log";
import { renderTemplateBoth, emailContextToMap } from "@/lib/email/template-render";
import type { EmailAttachmentInput, EmailContext, EmailLogEntry, EmailTemplateListItem } from "@/types/email";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignFacilitadorModalProps {
  osiId: number;
  osiNumber: string;
  osiCompany: string;
  /** Number of sessions for this OSI (used for per-session assignment). If <=1, hides the session selector. */
  sessionCount?: number;
  onClose: () => void;
}

interface AssignmentRow {
  id: number;
  facilitador_id?: number;
  nro_sesion: number | null;
  facilitadores?: {
    id?: number;
    nombre_apellido?: string;
    cedula?: string;
    email?: string;
  } | null;
}

export default function AssignFacilitadorModal({
  osiId,
  osiNumber,
  osiCompany,
  sessionCount = 1,
  onClose,
}: AssignFacilitadorModalProps) {
  const [loading, setLoading] = useState(true);
  const [currentAssignments, setCurrentAssignments] = useState<AssignmentRow[]>([]);
  const [facilitators, setFacilitators] = useState<Array<{ id: number; nombre_apellido: string; cedula?: string; email?: string }>>([]);
  const [selectedFacilitadorId, setSelectedFacilitadorId] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("all");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Email state
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachmentInput[]>([]);
  const [readingFiles, setReadingFiles] = useState(false);
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);

  // Real session count fetched from v_osi_formato_completo on open. The list
  // view only has sesiones_ejecucion (0/null for not-yet-executed OSIs), so the
  // prop is used only as the initial/fallback value to avoid flicker.
  const [realSessionCount, setRealSessionCount] = useState<number>(sessionCount);
  const [sessionCountLoaded, setSessionCountLoaded] = useState(false);

  // Use the fetched real count once loaded; fall back to the prop until then.
  const effectiveSessionCount = sessionCountLoaded ? realSessionCount : sessionCount;
  const hasMultipleSessions = effectiveSessionCount > 1;

  // Track whether the user has manually edited the email fields (so we don't
  // overwrite their edits when the facilitador/template changes).
  const [userEditedSubject, setUserEditedSubject] = useState(false);
  const [userEditedBody, setUserEditedBody] = useState(false);
  const [userEditedTo, setUserEditedTo] = useState(false);

  function formatRelativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "hace un momento";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `hace ${days}d`;
    return new Date(iso).toLocaleDateString("es-VE");
  }

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignRes, facilitatorsData, templatesData, configured, count, logs] = await Promise.all([
        getAssignmentByOSI(osiId),
        getActiveFacilitatorsForDropdown(),
        getEmailTemplates(),
        isEmailServerConfigured(),
        getOsiSessionCount(osiId),
        getEmailLogsForOSI(osiId),
      ]);

      if (assignRes.error) {
        setError(assignRes.error);
      } else {
        const data = assignRes.data as AssignmentRow | AssignmentRow[] | null;
        setCurrentAssignments(
          Array.isArray(data) ? data : data ? [data] : [],
        );
      }
      setFacilitators(facilitatorsData || []);
      setTemplates(templatesData || []);
      setEmailConfigured(configured);
      setRealSessionCount(count);
      setSessionCountLoaded(true);
      setEmailLogs(logs || []);

      // Pick the default template automatically.
      if (templatesData && templatesData.length > 0) {
        const def = templatesData.find((t) => t.is_default) || templatesData[0];
        setSelectedTemplateId(def.id.toString());
        // Load the default template's subject/body once.
        const defaultTpl = await getDefaultEmailTemplate("asignacion_facilitador");
        if (defaultTpl.data) {
          setEmailSubject(defaultTpl.data.subject);
          setEmailBody(defaultTpl.data.body);
          setUserEditedSubject(false);
          setUserEditedBody(false);
        }
      }
    } catch {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osiId]);

  // When the facilitador changes, fetch the email context + auto-fill "Para".
  useEffect(() => {
    if (!selectedFacilitadorId) {
      setEmailContext(null);
      if (!userEditedTo) setEmailTo("");
      return;
    }
    const facId = parseInt(selectedFacilitadorId);
    const fac = facilitators.find((f) => f.id === facId);
    if (fac && !userEditedTo) {
      setEmailTo(fac.email || "");
    }

    const nroSesion = selectedSession === "all" ? null : parseInt(selectedSession);
    let cancelled = false;
    getOSIEmailContext(osiId, facId, nroSesion)
      .then((res) => {
        if (cancelled) return;
        if (res.error) {
          console.error("[assign-modal] email context error:", res.error);
          return;
        }
        if (res.data) {
          setEmailContext(res.data);
          if (!userEditedTo) setEmailTo(res.data.facilitador_email || fac?.email || "");
        }
      })
      .catch((err) => console.error("[assign-modal] email context fetch failed:", err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacilitadorId, selectedSession]);

  // Re-render the email subject/body from the template when context or template
  // changes — but only if the user hasn't manually edited those fields.
  // (Handled by the templateCache + emailContext effects below.)

  // Keep a cache of raw template subject/body keyed by template id so switching
  // templates re-renders without an extra fetch.
  const [templateCache, setTemplateCache] = useState<Record<number, { subject: string; body: string }>>({});

  // When the selected template changes, load its raw subject/body (if not cached)
  // and re-render the email fields (unless the user edited them).
  useEffect(() => {
    if (!selectedTemplateId) return;
    const tplId = parseInt(selectedTemplateId);
    const cached = templateCache[tplId];
    if (cached) {
      reRenderFromTemplate(cached.subject, cached.body);
      return;
    }
    // Fetch full template once.
    import("@/app/actions/email-templates")
      .then((mod) => mod.getEmailTemplate(tplId))
      .then((res) => {
        if (res.data) {
          setTemplateCache((prev) => ({
            ...prev,
            [tplId]: { subject: res.data!.subject, body: res.data!.body },
          }));
          reRenderFromTemplate(res.data.subject, res.data.body);
        }
      })
      .catch((err) => console.error("[assign-modal] template fetch failed:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId]);

  function reRenderFromTemplate(rawSubject: string, rawBody: string) {
    if (!emailContext) return;
    const ctxMap = emailContextToMap(emailContext);
    const rendered = renderTemplateBoth(rawSubject, rawBody, ctxMap);
    if (!userEditedSubject) setEmailSubject(rendered.subject);
    if (!userEditedBody) setEmailBody(rendered.body);
  }

  // Re-render whenever emailContext changes (e.g. after facilitador switch)
  // and we have a cached template.
  useEffect(() => {
    if (!emailContext || !selectedTemplateId) return;
    const tplId = parseInt(selectedTemplateId);
    const cached = templateCache[tplId];
    if (cached) reRenderFromTemplate(cached.subject, cached.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailContext]);

  // Read a File as base64 (strips the data URL prefix).
  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip "data:<mime>;base64," prefix.
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("Error leyendo archivo"));
      reader.readAsDataURL(file);
    });
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setReadingFiles(true);
    try {
      const newAttachments: EmailAttachmentInput[] = [];
      for (const file of Array.from(files)) {
        const contentBase64 = await readFileAsBase64(file);
        newAttachments.push({
          filename: file.name,
          contentBase64,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        });
      }
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch {
      setError("Error al leer uno o más archivos adjuntos.");
    } finally {
      setReadingFiles(false);
      // Reset the input so the same file can be re-selected later.
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAssign = async (sendEmail: boolean) => {
    if (!selectedFacilitadorId) {
      setError("Seleccione un facilitador");
      return;
    }
    setAssigning(true);
    setError(null);
    setSuccess(null);
    setEmailResult(null);

    const nroSesion = selectedSession === "all" ? null : parseInt(selectedSession);
    const result = await assignOSIToFacilitador(
      osiId,
      parseInt(selectedFacilitadorId),
      "direct",
      nroSesion,
    );

    if (result.error) {
      setError(result.error);
      setAssigning(false);
      return;
    }

    const assignmentId = result.data?.id ?? null;
    let assignMsg = "Facilitador asignado exitosamente";

    // Send email if requested.
    if (sendEmail) {
      if (!emailTo.trim()) {
        setEmailResult("No se envió el correo: el facilitador no tiene email registrado.");
        setSuccess(assignMsg + " (sin correo: falta email)");
      } else {
        setSending(true);
        try {
          const sendRes = await sendAssignmentEmail({
            osiId,
            facilitadorId: parseInt(selectedFacilitadorId),
            assignmentId,
            to: emailTo,
            subject: emailSubject,
            body: emailBody,
            templateId: selectedTemplateId ? parseInt(selectedTemplateId) : null,
            attachments: attachments.length > 0 ? attachments : undefined,
          });
          if (sendRes.status === "sent") {
            setEmailResult("Correo enviado exitosamente");
            assignMsg += " y correo enviado";
          } else if (sendRes.status === "not_configured") {
            setEmailResult("Servidor de correo no configurado — el correo no se envió.");
            assignMsg += " (correo omitido: no configurado)";
          } else {
            setEmailResult(`Error al enviar correo: ${sendRes.error || "desconocido"}`);
            assignMsg += " (correo falló)";
          }
        } catch (err) {
          setEmailResult(
            `Error al enviar correo: ${err instanceof Error ? err.message : "desconocido"}`,
          );
          assignMsg += " (correo falló)";
        } finally {
          setSending(false);
        }
      }
    }

    setSuccess(assignMsg);
    setSelectedFacilitadorId("");
    setUserEditedSubject(false);
    setUserEditedBody(false);
    setUserEditedTo(false);
    setAttachments([]);
    await loadData();
    setTimeout(() => {
      setSuccess(null);
      setEmailResult(null);
    }, 5000);
    setAssigning(false);
  };

  const handleUnassign = async (assignmentId: number) => {
    if (!confirm("¿Está seguro de desasignar el facilitador de esta OSI?")) return;

    const result = await unassignOSIToFacilitador(assignmentId);
    if (result.error) {
      setError(result.error);
    } else {
      await loadData();
    }
  };

  const sessionLabel = (nroSesion: number | null) =>
    nroSesion === null ? "Todas las sesiones" : `Sesión ${nroSesion}`;

  const canSendEmail = useMemo(
    () => Boolean(selectedFacilitadorId && emailTo.trim() && emailSubject.trim() && emailBody.trim()),
    [selectedFacilitadorId, emailTo, emailSubject, emailBody],
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Asignar Facilitador
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {osiNumber} — {osiCompany}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            ✕
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500 mt-2">Cargando...</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Current Assignments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Facilitador(es) Actual(es)
              </h4>
              {currentAssignments.length > 0 ? (
                <div className="space-y-2">
                  {currentAssignments.map((a) => {
                    const log = emailLogs.find(
                      (l) => l.facilitador_id === a.facilitador_id || l.assignment_id === a.id,
                    );
                    return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {a.facilitadores?.nombre_apellido}
                        </span>
                        <span className="text-xs text-gray-500">
                          Cédula: {a.facilitadores?.cedula || "N/A"}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {sessionLabel(a.nro_sesion)}
                        </span>
                        {log && (
                          <span
                            className={`text-xs flex items-center gap-1 mt-1 ${
                              log.status === "sent"
                                ? "text-green-600"
                                : log.status === "failed"
                                  ? "text-red-500"
                                  : "text-gray-400"
                            }`}
                            title={new Date(log.sent_at).toLocaleString("es-VE")}
                          >
                            {log.status === "sent" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : log.status === "failed" ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            {log.status === "sent"
                              ? `Correo enviado ${formatRelativeTime(log.sent_at)}`
                              : log.status === "failed"
                                ? `Correo falló ${formatRelativeTime(log.sent_at)}`
                                : `Correo no configurado ${formatRelativeTime(log.sent_at)}`}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                        title="Desasignar facilitador"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic py-3">
                  No hay facilitador asignado a esta OSI
                </p>
              )}
            </div>

            {/* Assign New Facilitador */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Asignar Nuevo Facilitador
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  value={selectedFacilitadorId}
                  onValueChange={setSelectedFacilitadorId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar facilitador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {facilitators.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.nombre_apellido}
                        {f.cedula ? ` — ${f.cedula}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasMultipleSessions && (
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar sesión..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sesiones</SelectItem>
                      {Array.from({ length: effectiveSessionCount }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          Sesión {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Email Preview / Editor */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-600" />
                  Correo de Asignación
                </h4>
                <Link
                  href="/dashboard/capacitacion/plantillas-email"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <Settings className="w-3 h-3" />
                  Gestionar plantillas
                </Link>
              </div>

              {!emailConfigured && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2 text-amber-800 text-xs">
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Servidor de correo (MXroute) no configurado. La asignación
                    funcionará, pero el envío se omitirá hasta configurar las
                    credenciales SMTP.
                  </span>
                </div>
              )}

              {/* Template selector */}
              {templates.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Plantilla
                  </label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(v: string) => {
                      setSelectedTemplateId(v);
                      setUserEditedSubject(false);
                      setUserEditedBody(false);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar plantilla..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {t.name}
                          {t.is_default ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Email fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Para
                  </label>
                  <input
                    type="email"
                    value={emailTo}
                    onChange={(e) => {
                      setEmailTo(e.target.value);
                      setUserEditedTo(true);
                    }}
                    placeholder="email del facilitador"
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => {
                      setEmailSubject(e.target.value);
                      setUserEditedSubject(true);
                    }}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cuerpo
                  </label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => {
                      setEmailBody(e.target.value);
                      setUserEditedBody(true);
                    }}
                    className="font-mono text-xs min-h-[320px] whitespace-pre-wrap"
                    placeholder="Cuerpo del correo..."
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Adjuntos
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-400 cursor-pointer transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      {readingFiles ? "Leyendo..." : "Adjuntar archivos"}
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        disabled={readingFiles}
                        className="hidden"
                      />
                    </label>
                    {attachments.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {attachments.length} archivo{attachments.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachments.map((a, i) => (
                        <div
                          key={`${a.filename}-${i}`}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="text-gray-700 truncate">{a.filename}</span>
                            <span className="text-gray-400 shrink-0">{formatFileSize(a.size)}</span>
                          </div>
                          <button
                            onClick={() => removeAttachment(i)}
                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors shrink-0"
                            title="Quitar adjunto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {!selectedFacilitadorId && (
                <p className="text-xs text-gray-400 italic mt-2">
                  Seleccione un facilitador para poblar el correo con los datos de la OSI.
                </p>
              )}
            </div>

            {/* Error / Success / Email result */}
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
            {emailResult && (
              <div
                className={`p-3 border rounded-md flex items-start gap-2 text-sm ${
                  emailResult.includes("enviado exitosamente")
                    ? "bg-green-50 border-green-100 text-green-700"
                    : "bg-amber-50 border-amber-100 text-amber-700"
                }`}
              >
                <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{emailResult}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
              <Button
                onClick={() => handleAssign(true)}
                disabled={!selectedFacilitadorId || assigning || sending || !canSendEmail}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                {assigning || sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {sending ? "Enviando..." : "Asignando..."}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Asignar y Enviar
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleAssign(false)}
                disabled={!selectedFacilitadorId || assigning}
                variant="outline"
                className="flex-1"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Asignar sin enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
