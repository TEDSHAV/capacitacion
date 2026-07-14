"use client";

import { getAnalyticsMetrics } from "@/app/actions/participants";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  User,
  Award,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type ParticipantLookupResponse,
  type ParticipantCertificate,
} from "@/types";

export default function ParticipantLookup() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [participantData, setParticipantData] =
    useState<ParticipantLookupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentParticipants, setRecentParticipants] = useState<any[]>([]);

  useEffect(() => {
    async function loadStats() {
      const data = await getAnalyticsMetrics();
      setStats(data);
    }
    loadStats();

    async function loadRecent() {
      const data = await import("@/app/actions/participants").then((m) =>
        m.getRecentParticipants(),
      );
      setRecentParticipants(data || []);
    }
    loadRecent();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 2) {
      try {
        const response = await fetch(
          `/api/participants/${encodeURIComponent(value)}?suggest=true`,
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      handleSelectParticipant(suggestions[selectedIndex]);
    }
  };

  const handleSelectParticipant = (participant: any) => {
    setSearchQuery(participant.cedula);
    setShowSuggestions(false);
    fetchParticipantData(participant.cedula);
  };

  const fetchParticipantData = async (query: string) => {
    setLoading(true);
    setError(null);
    setParticipantData(null);
    setCurrentPage(1);

    try {
      const response = await fetch(
        `/api/participants/${encodeURIComponent(query.trim())}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Participant not found");
      }
      const data = await response.json();
      setParticipantData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch participant data",
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split("-").map(Number);
    const monthNames = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    return `${day} de ${monthNames[month - 1]} de ${year}`;
  };

  const downloadCertificate = async (certificateId: number) => {
    try {
      const response = await fetch(
        `/api/generate-certificate-pdf/${certificateId}`,
      );
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading certificate:", error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto" ref={searchRef}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Consulta de Participantes
        </h1>
        <p className="text-gray-600 mb-6">
          Busque participantes por número de cédula o nombre para ver su
          historial de certificados
        </p>

        {/* Metrics Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Participantes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_participants || 0}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
              <Award className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Certificados Emitidos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_certificates || 0}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Promedio General</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.average_score || 0}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
              <Download className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.certificates_this_month || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8 relative">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ingrese número de cédula o nombre"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {suggestions.map((s, index) => (
                  <li
                    key={s.id}
                    className={`px-4 py-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 ${index === selectedIndex ? "bg-blue-50" : "hover:bg-gray-50"}`}
                    onClick={() => handleSelectParticipant(s)}
                  >
                    <div className="font-medium text-gray-900">{s.nombre}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      Cédula: {s.cedula}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            onClick={() => fetchParticipantData(searchQuery)}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {!participantData && recentParticipants.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Participantes Recientes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Cédula</th>
                  <th className="px-4 py-3">Nacionalidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentParticipants.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSearchQuery(p.cedula);
                      fetchParticipantData(p.cedula);
                    }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 text-blue-600">
                      {p.nombre}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.cedula}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">
                      {p.nacionalidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {participantData && (
        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Información del Participante
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Nombre</p>
                <p className="font-medium text-gray-900">
                  {participantData.participant.nombre}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cédula</p>
                <p className="font-medium text-gray-900">
                  {participantData.participant.cedula}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nacionalidad</p>
                <p className="font-medium text-gray-900">
                  {participantData.participant.nacionalidad === "venezolano"
                    ? "Venezolano"
                    : participantData.participant.nacionalidad === "extranjero"
                      ? "Extranjero"
                      : participantData.participant.nacionalidad}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Historial de Certificados
            </h2>
            <div className="space-y-4">
              {participantData.certificates
                .slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage,
                )
                .map((certificate: ParticipantCertificate) => (
                  <div
                    key={certificate.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {certificate.parsed_snapshot?.certificado_detalles
                            ?.title ||
                            certificate.cursos?.nombre ||
                            "Certificado"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Fecha: {formatDate(certificate.fecha_emision)} |
                          Empresa: {certificate.empresas?.razon_social || "N/A"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            window.open(
                              `/verify-certificate/${certificate.id}`,
                              "_blank",
                            )
                          }
                          className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700"
                        >
                          <Search className="h-4 w-4" />
                          Verificar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadCertificate(certificate.id)}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {participantData.certificates.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">Página {currentPage}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={
                    currentPage * itemsPerPage >=
                    participantData.certificates.length
                  }
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
