"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import {
  getActiveControlSequence,
  getAllControlSequences,
  hasCertificatesBeenGenerated,
} from "@/app/actions/control-sequences";
import { ControlSequenceConfig } from "@/types";
import SequenceConfigForm from "./components/SequenceConfigForm";

export default function SecuenciasControlPage() {
  const router = useRouter();
  const [activeSequence, setActiveSequence] = useState<ControlSequenceConfig | null>(null);
  const [allSequences, setAllSequences] = useState<ControlSequenceConfig[]>([]);
  const [hasCertificates, setHasCertificates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [activeResult, allResult, certResult] = await Promise.all([
        getActiveControlSequence(),
        getAllControlSequences(),
        hasCertificatesBeenGenerated(),
      ]);

      if (activeResult.success && activeResult.data) {
        setActiveSequence(activeResult.data);
      }

      if (allResult.success && allResult.data) {
        setAllSequences(allResult.data);
      }

      if (certResult.success) {
        setHasCertificates(certResult.hasData);
      }
    } catch (err) {
      setError("Error loading control sequence configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSequenceCreated = () => {
    loadData();
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Secuencias de Control
        </h1>
        <p className="text-gray-600 mt-2">
          Configura los números iniciales para los certificados (Libro, Hoja,
          Línea, Nro. Control)
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {hasCertificates && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">
              Certificados ya generados
            </h3>
            <p className="text-sm text-amber-700">
              La secuencia de control está bloqueada. Los números se determinan
              automáticamente a partir del último certificado generado.
            </p>
          </div>
        </div>
      )}

      {!hasCertificates && !activeSequence && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">
              Configuración requerida
            </h3>
            <p className="text-sm text-blue-700">
              Configura los números iniciales antes de generar certificados.
              Esto es especialmente importante si estás migrando desde un sistema
              anterior.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        {!hasCertificates && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {activeSequence
                ? "Actualizar Configuración"
                : "Configurar Secuencia"}
            </h2>
            <SequenceConfigForm
              onSuccess={handleSequenceCreated}
              disabled={hasCertificates}
            />
          </div>
        )}

        {/* Current Configuration */}
        {activeSequence && (
          <div className="bg-white border border-green-200 rounded-lg p-6 bg-green-50">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Configuración Activa
              </h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded p-3">
                <p className="text-sm text-gray-600">Libro Nro.</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeSequence.nro_libro}
                </p>
              </div>

              <div className="bg-white rounded p-3">
                <p className="text-sm text-gray-600">Hoja Nro.</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeSequence.nro_hoja}
                </p>
              </div>

              <div className="bg-white rounded p-3">
                <p className="text-sm text-gray-600">Línea Nro.</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeSequence.nro_linea}
                </p>
              </div>

              <div className="bg-white rounded p-3">
                <p className="text-sm text-gray-600">Nro. Control</p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeSequence.nro_control}
                </p>
              </div>

              {activeSequence.notes && (
                <div className="bg-white rounded p-3">
                  <p className="text-sm text-gray-600">Notas</p>
                  <p className="text-sm text-gray-900">{activeSequence.notes}</p>
                </div>
              )}

              <div className="bg-white rounded p-3 border-t pt-3">
                <p className="text-xs text-gray-500">Configurado el</p>
                <p className="text-sm text-gray-900">
                  {new Date(activeSequence.created_at).toLocaleDateString(
                    "es-VE",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {allSequences.length > 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Historial de Configuraciones
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Libro
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Hoja
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Línea
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Nro. Control
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {allSequences.map((seq) => (
                  <tr
                    key={seq.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-900">{seq.nro_libro}</td>
                    <td className="py-3 px-4 text-gray-900">{seq.nro_hoja}</td>
                    <td className="py-3 px-4 text-gray-900">{seq.nro_linea}</td>
                    <td className="py-3 px-4 text-gray-900">
                      {seq.nro_control}
                    </td>
                    <td className="py-3 px-4">
                      {seq.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(seq.created_at).toLocaleDateString("es-VE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
