"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import {
  Loader2,
  Mail,
  MailCheck,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { getEmailLogs } from "@/app/actions/email-log";
import type { EmailLogEntry, EmailLogStatus } from "@/types/email";

const STATUS_LABELS: Record<EmailLogStatus, string> = {
  sent: "Enviado",
  failed: "Falló",
  not_configured: "No configurado",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

function StatusBadge({ status }: { status: EmailLogStatus }) {
  const styles: Record<EmailLogStatus, string> = {
    sent: "bg-green-100 text-green-700 border-green-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    not_configured: "bg-gray-100 text-gray-500 border-gray-200",
  };
  const icons: Record<EmailLogStatus, typeof CheckCircle2> = {
    sent: CheckCircle2,
    failed: AlertCircle,
    not_configured: Mail,
  };
  const Icon = icons[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      <Icon className="w-3 h-3" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function RegistroCorreosClient() {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmailLogs({ limit: 200 });
      setLogs(data);
    } catch {
      setError("Error al cargar el registro de correos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.to_email.toLowerCase().includes(q) ||
          l.subject.toLowerCase().includes(q) ||
          (l.facilitadores?.nombre_apellido || "").toLowerCase().includes(q) ||
          String(l.osi_id || "").includes(q),
      );
    }
    return result;
  }, [logs, statusFilter, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8 bg-white min-h-screen">
      <div className="mb-6 flex items-center gap-3">
        <MailCheck className="w-6 h-6 text-teal-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Correos</h1>
          <p className="text-sm text-gray-500">
            Historial de correos enviados desde el módulo de asignación de facilitadores
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por OSI, facilitador, destinatario o asunto..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EmailLogStatus | "all")}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        >
          <option value="all">Todos los estados</option>
          <option value="sent">Enviados</option>
          <option value="failed">Fallidos</option>
          <option value="not_configured">No configurados</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay correos registrados</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">OSI</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Facilitador</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Destinatario</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Asunto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">Adj.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                const attachmentCount = Array.isArray(log.attachments) ? log.attachments.length : 0;
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap" title={formatDate(log.sent_at)}>
                        {formatRelativeTime(log.sent_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {log.osi_id ? `#${log.osi_id}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {log.facilitadores?.nombre_apellido || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[180px]">
                        {log.to_email}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {log.subject}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {attachmentCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                            <Paperclip className="w-3 h-3" />
                            {attachmentCount}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase">Fecha completa</span>
                              <p className="text-sm text-gray-700">{formatDate(log.sent_at)}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase">Asunto</span>
                              <p className="text-sm text-gray-900 font-medium">{log.subject}</p>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase">Cuerpo</span>
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono bg-white border border-gray-200 rounded-md p-3 mt-1 max-h-64 overflow-y-auto">
                                {log.body_sent}
                              </pre>
                            </div>
                            {log.error_message && (
                              <div>
                                <span className="text-xs font-semibold text-red-500 uppercase">Error</span>
                                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mt-1">
                                  {log.error_message}
                                </p>
                              </div>
                            )}
                            {attachmentCount > 0 && (
                              <div>
                                <span className="text-xs font-semibold text-gray-500 uppercase">Adjuntos</span>
                                <div className="mt-1 space-y-1">
                                  {log.attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                      <Paperclip className="w-3 h-3 text-gray-400" />
                                      <span>{att.name}</span>
                                      {att.size > 0 && (
                                        <span className="text-gray-400">
                                          ({att.size < 1024 ? `${att.size} B` : `${(att.size / 1024).toFixed(1)} KB`})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          Mostrando {filteredLogs.length} de {logs.length} registro(s)
        </p>
      )}
    </div>
  );
}
