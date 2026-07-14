"use client";

import { useState, useMemo } from "react";
import {
  CertificateParticipant,
  CertificateGeneration,
  CertificateOSI,
  ManualOSIInput,
  Empresa,
  CourseTopic,
  PaperSize,
} from "@/types";
import { ManualOSIInput as ManualOSIInputComponent } from "@/app/dashboard/capacitacion/generacion-certificado/components/manual-osi-input";
import { CoordinateEditor } from "./components/CoordinateEditor";
import { ParticipantTable } from "./components/ParticipantTable";
import {
  CertCoordinateConfig,
  CarnetCoordinateConfig,
  DEFAULT_CERT_COORDINATES,
  DEFAULT_CARNET_COORDINATES,
} from "@/lib/custom-coordinate-types";
import { saveCustomCertificatesToDatabase } from "@/app/actions/custom-certificados";
import { saveCustomCarnetsToDatabase } from "@/app/actions/custom-carnets";
import { generateDocumentsServer } from "@/lib/document-server-actions";
import { generateCustomCertificate } from "@/lib/custom-certificate-generator";
import { CustomCarnetGenerator } from "@/lib/custom-carnet-generator";
import { getFacilitatorsAction } from "@/app/actions/facilitators-crud";
import { getFacilitatorData } from "@/app/actions/facilitators";
import {
  checkOSIHasAnyCertificatesAction,
  checkOSIHasCertificatesForCourseAction,
} from "@/app/actions/certificados";
import { ChevronDown, ChevronUp, Loader2, FileText, Award, CheckCircle, AlertCircle } from "lucide-react";

interface GeneracionPersonalizadaClientProps {
  companies: Empresa[];
  cities: any[];
  courses: CourseTopic[];
  certTemplates: any[];
  carnetTemplates: any[];
  signatures: any[];
  facilitadores: any[];
}

export function GeneracionPersonalizadaClient({
  companies,
  cities,
  courses,
  certTemplates,
  carnetTemplates,
  signatures,
  facilitadores,
}: GeneracionPersonalizadaClientProps) {
  const [manualOSIData, setManualOSIData] = useState<ManualOSIInput>({});
  const [selectedCourseTopic, setSelectedCourseTopic] = useState<CourseTopic | null>(null);
  const [selectedCertTemplate, setSelectedCertTemplate] = useState<any>(null);
  const [selectedCarnetTemplate, setSelectedCarnetTemplate] = useState<any>(null);
  const [participants, setParticipants] = useState<CertificateParticipant[]>([]);
  const [certCoords, setCertCoords] = useState<CertCoordinateConfig>({ ...DEFAULT_CERT_COORDINATES });
  const [carnetCoords, setCarnetCoords] = useState<CarnetCoordinateConfig>({ ...DEFAULT_CARNET_COORDINATES });
  const [showCoordEditor, setShowCoordEditor] = useState(false);
  const [hasAttemptedSubmission, setHasAttemptedSubmission] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>("");
  const [generationResult, setGenerationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [manualOSIHasAnyCertificates, setManualOSIHasAnyCertificates] = useState(false);
  const [manualOSIHasCourseCertificates, setManualOSIHasCourseCertificates] = useState(false);

  const [certificateDetails, setCertificateDetails] = useState({
    title: "",
    subtitle: "",
    date: new Date().toLocaleDateString("en-CA"),
    location: "",
    horas_estimadas: 8,
    fecha_vencimiento: "",
    facilitator_id: "",
    sha_signature_id: "",
    generate_documents: true,
    paperSize: "half-letter-custom" as PaperSize,
  });

  const buildMockOSI = (manualData: ManualOSIInput): CertificateOSI => {
    let companyName = manualData.company_name || "";
    if (!companyName && manualData.company_id) {
      const company = companies.find(
        (c) => c.id.toString() === (manualData.company_id?.toString() || ""),
      );
      if (company) {
        companyName = company.razon_social || "";
      }
    }

    return {
      id: "manual",
      nro_osi: manualData.osi_number || "MANUAL",
      tipo_servicio: "Manual",
      cliente_nombre_empresa: companyName,
      id_curso: null,
      empresa_id: manualData.company_id ? parseInt(manualData.company_id) : 0,
      direccion_ejecucion: "",
      fecha_servicio: undefined,
      fecha_emision: undefined,
      id_ciudad: manualData.city_id,
      is_active: true,
      has_certificates:
        manualOSIHasCourseCertificates || manualOSIHasAnyCertificates,
    };
  };

  const handleManualOSIDataChange = (field: keyof ManualOSIInput, value: any) => {
    setManualOSIData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    setHasAttemptedSubmission(true);
    setGenerationResult(null);

    if (!manualOSIData.osi_number?.trim()) {
      setGenerationResult({ success: false, message: "Número OSI es requerido" });
      return;
    }
    if (!manualOSIData.company_id && !manualOSIData.company_name?.trim()) {
      setGenerationResult({ success: false, message: "Empresa es requerida" });
      return;
    }
    if (!manualOSIData.city_id) {
      setGenerationResult({ success: false, message: "Ciudad es requerida" });
      return;
    }
    if (!selectedCourseTopic) {
      setGenerationResult({ success: false, message: "Curso es requerido" });
      return;
    }
    if (participants.length === 0) {
      setGenerationResult({ success: false, message: "Al menos un participante es requerido" });
      return;
    }
    if (!certificateDetails.title.trim()) {
      setGenerationResult({ success: false, message: "Título del certificado es requerido" });
      return;
    }

    setIsGenerating(true);
    setGenerationStatus("Guardando certificados en base de datos...");

    try {
      const mockOSI = buildMockOSI(manualOSIData);

      const certData: CertificateGeneration = {
        osi_id: "manual",
        osi_data: mockOSI,
        certificate_title: certificateDetails.title,
        certificate_subtitle: certificateDetails.subtitle || undefined,
        passing_grade: selectedCourseTopic.nota_aprobatoria ?? 14,
        course_topic_id: selectedCourseTopic.id,
        course_topic_data: selectedCourseTopic as any,
        participants,
        location: certificateDetails.location,
        date: certificateDetails.date,
        horas_estimadas: certificateDetails.horas_estimadas,
        facilitator_id: certificateDetails.facilitator_id || undefined,
        sha_signature_id: certificateDetails.sha_signature_id || undefined,
        fecha_vencimiento: certificateDetails.fecha_vencimiento || undefined,
        id_plantilla_certificado: selectedCertTemplate?.id ? parseInt(selectedCertTemplate.id) : undefined,
        id_plantilla_carnet: selectedCarnetTemplate?.id ? parseInt(selectedCarnetTemplate.id) : undefined,
        plantilla_certificado_archivo: selectedCertTemplate?.archivo || undefined,
        generate_documents: certificateDetails.generate_documents,
        include_previous_participants: false,
        paperSize: certificateDetails.paperSize,
        manual_mode: true,
        manual_osi_data: manualOSIData,
      };

      const dbResult = await saveCustomCertificatesToDatabase(certData, participants);

      if (!dbResult.success) {
        setGenerationResult({ success: false, message: dbResult.message });
        setIsGenerating(false);
        return;
      }

      setGenerationStatus(`Certificados guardados: ${dbResult.certificateIds?.length}. Generando PDFs...`);

      const certTemplatePath = selectedCertTemplate?.archivo
        ? selectedCertTemplate.archivo.startsWith("/")
          ? selectedCertTemplate.archivo
          : `/${selectedCertTemplate.archivo}`
        : "";

      const BATCH_SIZE = 10;
      for (let i = 0; i < participants.length; i += BATCH_SIZE) {
        const batch = participants.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (participant, batchIndex) => {
            const globalIndex = i + batchIndex;
            try {
              await generateCustomCertificate(
                participant,
                certData,
                certTemplatePath,
                certCoords,
                {
                  paperSize: certificateDetails.paperSize,
                },
              );
            } catch (e) {
              console.error("PDF generation error for participant:", participant.name, e);
            }
          }),
        );
        setGenerationStatus(`PDFs generados: ${Math.min(i + BATCH_SIZE, participants.length)}/${participants.length}`);
      }

      if (selectedCarnetTemplate && selectedCourseTopic.emite_carnet) {
        setGenerationStatus("Guardando carnets...");
        const carnetDataList = participants.map((participant, index) => ({
          id_certificado: dbResult.certificateIds![index],
          id_participante: dbResult.participantIds![index],
          id_empresa: mockOSI.empresa_id || null,
          id_curso: selectedCourseTopic.id ? parseInt(selectedCourseTopic.id) : null,
          id_osi: null,
          titulo_curso: certificateDetails.title,
          subtitulo_curso: certificateDetails.subtitle || null,
          fecha_emision: certificateDetails.date,
          fecha_vencimiento: certificateDetails.fecha_vencimiento || null,
          nombre_participante: participant.name,
          cedula_participante: participant.idNumber,
          empresa_participante: null,
          nro_control: dbResult.certificateNumbers![index]?.nro_control || 0,
          id_plantilla_carnet: selectedCarnetTemplate?.id ? parseInt(selectedCarnetTemplate.id) : undefined,
        }));

        const carnetResult = await saveCustomCarnetsToDatabase(
          carnetDataList,
          dbResult.certificateIds!,
        );

        if (carnetResult.success) {
          setGenerationStatus(`Carnets guardados: ${carnetResult.carnetIds?.length}. Generando PDFs de carnet...`);

          const carnetTemplatePath = selectedCarnetTemplate?.archivo
            ? selectedCarnetTemplate.archivo.startsWith("/")
              ? selectedCarnetTemplate.archivo
              : `/${selectedCarnetTemplate.archivo}`
            : "";

          const customCarnetGen = new CustomCarnetGenerator(carnetCoords);

          for (let i = 0; i < participants.length; i += BATCH_SIZE) {
            const batch = participants.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(async (participant, batchIndex) => {
                const globalIndex = i + batchIndex;
                try {
                  await customCarnetGen.generateCarnet({
                    participant,
                    carnetData: carnetDataList[globalIndex] as any,
                    templateImage: carnetTemplatePath,
                  });
                } catch (e) {
                  console.error("Carnet PDF error for participant:", participant.name, e);
                }
              }),
            );
          }
        }
      }

      if (certificateDetails.generate_documents) {
        setGenerationStatus("Generando documentos adicionales...");
        try {
          const certificateRecords = participants.map((participant, index) => ({
            participant_name: participant.name,
            participant_id_number: participant.idNumber,
            participant_id_type: participant.idType,
            participant_nationality: participant.nationality,
            course_title: certificateDetails.title,
            course_subtitle: certificateDetails.subtitle,
            company_name: mockOSI.cliente_nombre_empresa || "",
            osi_number: mockOSI.nro_osi || "",
            city: certificateDetails.location || "",
            location: certificateDetails.location || "",
            execution_address: mockOSI.direccion_ejecucion || "",
            execution_date: certificateDetails.date,
            control_number: dbResult.certificateNumbers![index]?.nro_control,
            score: participant.score,
          }));

          await generateDocumentsServer({
            certificates: certificateRecords,
            osiData: {
              ...mockOSI,
              ciudad: certificateDetails.location,
            },
            firmanteData: {
              nombre: "DPTO. CAPACITACIÓN / SHA DE VENEZUELA, C.A.",
              cargo: "Jefe de Capacitación",
            },
            options: {
              includeCertificacionCompetencias: true,
              includeNotaEntrega: true,
              includeValidacionDatos: true,
            },
          });
        } catch (e) {
          console.error("Additional docs generation error:", e);
        }
      }

      setGenerationResult({
        success: true,
        message: `Se generaron ${dbResult.certificateIds?.length} certificados exitosamente. Disponibles en gestion-osi y reportes.`,
      });
      setGenerationStatus("");
    } catch (error) {
      setGenerationResult({
        success: false,
        message: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStatus("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Generación Personalizada (Dev)
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Genera certificados, carnets y documentos adicionales con plantillas personalizadas y coordenadas editables. Los registros se almacenan en las tablas existentes y son visibles en gestion-osi y reportes.
          </p>
        </div>

        <ManualOSIInputComponent
          companies={companies}
          cities={cities}
          courseTopics={courses}
          data={manualOSIData}
          onDataChange={handleManualOSIDataChange}
          onCourseSelect={(course) => {
            setSelectedCourseTopic(course);
            setCertificateDetails((prev) => ({
              ...prev,
              title: course.nombre || course.name || prev.title,
              horas_estimadas: course.horas_estimadas || prev.horas_estimadas,
            }));
          }}
          selectedCourseTopic={selectedCourseTopic}
          hasAttemptedSubmission={hasAttemptedSubmission}
          onHasAnyCertificatesChange={setManualOSIHasAnyCertificates}
          onHasCourseCertificatesChange={setManualOSIHasCourseCertificates}
        />

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Detalles del Certificado</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input
                type="text"
                value={certificateDetails.title}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Título del certificado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
              <input
                type="text"
                value={certificateDetails.subtitle}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, subtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Subtítulo opcional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={certificateDetails.date}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
              <input
                type="text"
                value={certificateDetails.location}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ciudad de emisión"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horas</label>
              <input
                type="number"
                value={certificateDetails.horas_estimadas}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, horas_estimadas: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Vencimiento</label>
              <input
                type="date"
                value={certificateDetails.fecha_vencimiento}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, fecha_vencimiento: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facilitador</label>
              <select
                value={certificateDetails.facilitator_id}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, facilitator_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar facilitador...</option>
                {facilitadores.map((f: any) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre_apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma SHA</label>
              <select
                value={certificateDetails.sha_signature_id}
                onChange={(e) => setCertificateDetails({ ...certificateDetails, sha_signature_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar firma...</option>
                {signatures.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Plantillas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla Certificado</label>
              <select
                value={selectedCertTemplate?.id || ""}
                onChange={(e) => {
                  const t = certTemplates.find((t) => t.id.toString() === e.target.value);
                  setSelectedCertTemplate(t || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar plantilla...</option>
                {certTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.is_active ? "(Activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla Carnet</label>
              <select
                value={selectedCarnetTemplate?.id || ""}
                onChange={(e) => {
                  const t = carnetTemplates.find((t) => t.id.toString() === e.target.value);
                  setSelectedCarnetTemplate(t || null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar plantilla...</option>
                {carnetTemplates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} {t.is_active ? "(Activa)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <ParticipantTable
          participants={participants}
          onParticipantsChange={setParticipants}
          passingGrade={selectedCourseTopic?.nota_aprobatoria ?? 14}
        />

        <div>
          <button
            onClick={() => setShowCoordEditor(!showCoordEditor)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {showCoordEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Editor de Coordenadas
          </button>
          {showCoordEditor && (
            <div className="mt-3">
              <CoordinateEditor
                certCoords={certCoords}
                carnetCoords={carnetCoords}
                onCertCoordsChange={setCertCoords}
                onCarnetCoordsChange={setCarnetCoords}
                certTemplateKey={selectedCertTemplate?.archivo || "default"}
                carnetTemplateKey={selectedCarnetTemplate?.archivo || "default"}
              />
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={certificateDetails.generate_documents}
                  onChange={(e) => setCertificateDetails({ ...certificateDetails, generate_documents: e.target.checked })}
                  className="rounded"
                />
                Generar documentos adicionales
              </label>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generar Certificados
                </>
              )}
            </button>
          </div>

          {generationStatus && (
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              {generationStatus}
            </div>
          )}

          {generationResult && (
            <div
              className={`mt-4 flex items-start gap-2 p-3 rounded-lg text-sm ${
                generationResult.success
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {generationResult.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{generationResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
