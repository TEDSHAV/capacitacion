"use client";

import { useState, useEffect, useRef } from "react";
import {
  CertificateGeneration,
  CertificateOSI,
  ManualOSIInput,
  Empresa,
  CourseTopic,
  PaperSize,
} from "@/types";
import { CustomParticipant } from "@/lib/custom-participant-types";
import { ManualOSIInput as ManualOSIInputComponent } from "@/app/dashboard/capacitacion/generacion-certificado/components/manual-osi-input";
import { CoordinateEditor } from "./components/CoordinateEditor";
import { ParticipantTable } from "./components/ParticipantTable";
import { CustomPreviewModal } from "./components/CustomPreviewModal";
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
import { ChevronDown, ChevronUp, Loader2, FileText, Award, CheckCircle, AlertCircle, Eye, AlertTriangle, Upload } from "lucide-react";
import { createTemplateRecord } from "@/app/actions/template-actions";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import { QRService } from "@/lib/qr-service";

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
  const [participants, setParticipants] = useState<CustomParticipant[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [controlNumberWarning, setControlNumberWarning] = useState<string | null>(null);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState<"certificate" | "carnet" | null>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const carnetFileInputRef = useRef<HTMLInputElement>(null);
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

  const preloadImage = async (url: string): Promise<string> => {
    if (!url) return "";
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  };

  const [certTemplatesState, setCertTemplatesState] = useState<any[]>(certTemplates);
  const [carnetTemplatesState, setCarnetTemplatesState] = useState<any[]>(carnetTemplates);

  const refreshTemplates = async (type: "certificate" | "carnet") => {
    const supabase = createBrowserClient();
    const tableName = type === "certificate" ? "plantillas_certificados" : "plantillas_carnets";
    const { data } = await supabase
      .from(tableName)
      .select("*")
      .order("is_active", { ascending: false })
      .order("nombre");
    if (data) {
      if (type === "certificate") {
        setCertTemplatesState(data);
      } else {
        setCarnetTemplatesState(data);
      }
    }
  };

  const handleTemplateUpload = async (
    file: File,
    type: "certificate" | "carnet",
  ) => {
    if (!file) return;
    setUploadingTemplate(type);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", type === "certificate" ? "certificate" : "carnet");

      const uploadResponse = await fetch("/api/upload-template", {
        method: "POST",
        body: uploadFormData,
      });
      const uploadResult = await uploadResponse.json();

      if (!uploadResult.success) {
        throw new Error(`Error al subir archivo: ${uploadResult.error}`);
      }

      const templateName = file.name.replace(/\.[^.]+$/, "");
      const result = await createTemplateRecord(
        templateName,
        uploadResult.fileName,
        uploadResult.url,
        type,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Error al guardar en base de datos");
      }

      await refreshTemplates(type);

      if (type === "certificate") {
        setSelectedCertTemplate(result.data);
      } else {
        setSelectedCarnetTemplate(result.data);
      }
    } catch (error) {
      alert(`Error al subir plantilla: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setUploadingTemplate(null);
    }
  };

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
    if (field === "city_id" && value) {
      const city = cities.find((c: any) => c.id.toString() === value.toString());
      if (city) {
        setCertificateDetails((prev) => ({ ...prev, location: city.nombre_ciudad }));
      }
    }
  };

  useEffect(() => {
    if (participants.length > 0 && !warningAcknowledged) {
      const invalid = participants.filter(
        (p) =>
          p.nro_libro < 1 ||
          p.nro_hoja < 1 || p.nro_hoja > 100 ||
          p.nro_linea < 1 || p.nro_linea > 10 ||
          p.nro_control < 1,
      );
      if (invalid.length > 0) {
        setControlNumberWarning(
          `${invalid.length} participante(s) tienen números de control inválidos (libro>=1, hoja 1-100, línea 1-10, control>=1).`,
        );
      } else {
        setControlNumberWarning(null);
      }
    } else {
      setControlNumberWarning(null);
    }
  }, [participants, warningAcknowledged]);

  const buildCertificateData = (): CertificateGeneration => {
    const mockOSI = buildMockOSI(manualOSIData);
    return {
      osi_id: "manual",
      osi_data: mockOSI,
      certificate_title: certificateDetails.title,
      certificate_subtitle: certificateDetails.subtitle || undefined,
      passing_grade: selectedCourseTopic?.nota_aprobatoria ?? 14,
      course_topic_id: selectedCourseTopic?.id || "",
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
      course_content: selectedCourseTopic?.contenido_curso || "",
      generate_documents: certificateDetails.generate_documents,
      include_previous_participants: false,
      paperSize: certificateDetails.paperSize,
      manual_mode: true,
      manual_osi_data: manualOSIData,
    };
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
    const invalidParticipants = participants.filter(
      (p) =>
        p.nro_libro < 1 ||
        p.nro_hoja < 1 || p.nro_hoja > 100 ||
        p.nro_linea < 1 || p.nro_linea > 10 ||
        p.nro_control < 1,
    );
    if (invalidParticipants.length > 0) {
      setGenerationResult({
        success: false,
        message: `${invalidParticipants.length} participante(s) tienen números de control inválidos. Revisa libro (>=1), hoja (1-100), línea (1-10), control (>=1).`,
      });
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
        course_content: selectedCourseTopic.contenido_curso || "",
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

      setGenerationStatus(`Certificados guardados: ${dbResult.certificateIds?.length}. Preloading assets...`);

      const certTemplatePath = selectedCertTemplate?.archivo
        ? selectedCertTemplate.archivo.startsWith("/")
          ? selectedCertTemplate.archivo.startsWith("/templates/")
            ? selectedCertTemplate.archivo
            : `/templates${selectedCertTemplate.archivo}`
          : `/templates/${selectedCertTemplate.archivo}`
        : "";

      setGenerationStatus(`Certificados guardados: ${dbResult.certificateIds?.length}. Generando PDFs...`);

      const sealImageUrl = "/templates/sello.png";
      const [sealBase64, facilitatorData] = await Promise.all([
        preloadImage(sealImageUrl),
        certificateDetails.facilitator_id
          ? getFacilitatorData(certificateDetails.facilitator_id)
          : Promise.resolve(null),
      ]);

      let facilitatorSignatureBase64 = "";
      if (facilitatorData) {
        const fData = facilitatorData as any;
        if (fData.signature_data?.imagen_base64) {
          facilitatorSignatureBase64 = `data:image/png;base64,${fData.signature_data.imagen_base64}`;
        } else if (fData.signature_data?.url_imagen) {
          facilitatorSignatureBase64 = await preloadImage(fData.signature_data.url_imagen);
        } else if (fData.firma) {
          facilitatorSignatureBase64 = await preloadImage(fData.firma);
        }
        certData.facilitator_data = facilitatorData as any;
      }

      let shaSignatureBase64 = "";
      if (certificateDetails.sha_signature_id && signatures.length > 0) {
        const shaSig = signatures.find(
          (s: any) => s.id.toString() === certificateDetails.sha_signature_id,
        );
        if (shaSig) {
          if (shaSig.imagen_base64) {
            shaSignatureBase64 = `data:image/png;base64,${shaSig.imagen_base64}`;
          } else if (shaSig.url_imagen) {
            shaSignatureBase64 = await preloadImage(shaSig.url_imagen);
          }
          certData.sha_signature_data = shaSig as any;
        }
      }

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
                  sealImage: sealBase64 || sealImageUrl,
                  paperSize: certificateDetails.paperSize,
                  preloadedAssets: {
                    facilitator: facilitatorData as any,
                    facilitatorSignature: facilitatorSignatureBase64,
                    shaSignature: shaSignatureBase64,
                  },
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
              ? selectedCarnetTemplate.archivo.startsWith("/templates/")
                ? selectedCarnetTemplate.archivo
                : `/templates${selectedCarnetTemplate.archivo}`
              : `/templates/${selectedCarnetTemplate.archivo}`
            : "";

          const customCarnetGen = new CustomCarnetGenerator(carnetCoords);

          for (let i = 0; i < participants.length; i += BATCH_SIZE) {
            const batch = participants.slice(i, i + BATCH_SIZE);
            await Promise.all(
              batch.map(async (participant, batchIndex) => {
                const globalIndex = i + batchIndex;
                try {
                  const certificateId = dbResult.certificateIds![globalIndex];
                  const qrData = QRService.generateQRData(certificateId);
                  const qrDataURL = await QRService.generateQRDataURL({
                    data: qrData,
                    size: 60,
                    level: "M",
                    includeMargin: true,
                  });

                  await customCarnetGen.generateCarnet({
                    participant,
                    carnetData: carnetDataList[globalIndex] as any,
                    templateImage: carnetTemplatePath,
                    qrDataURL,
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
              <div className="flex gap-2">
                <select
                  value={selectedCertTemplate?.id || ""}
                  onChange={(e) => {
                    const t = certTemplatesState.find((t) => t.id.toString() === e.target.value);
                    setSelectedCertTemplate(t || null);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar plantilla...</option>
                  {certTemplatesState.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.is_active ? "(Activa)" : ""}
                    </option>
                  ))}
                </select>
                <input
                  ref={certFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTemplateUpload(file, "certificate");
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => certFileInputRef.current?.click()}
                  disabled={uploadingTemplate === "certificate"}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  title="Subir nueva plantilla de certificado"
                >
                  {uploadingTemplate === "certificate" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plantilla Carnet</label>
              <div className="flex gap-2">
                <select
                  value={selectedCarnetTemplate?.id || ""}
                  onChange={(e) => {
                    const t = carnetTemplatesState.find((t) => t.id.toString() === e.target.value);
                    setSelectedCarnetTemplate(t || null);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar plantilla...</option>
                  {carnetTemplatesState.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} {t.is_active ? "(Activa)" : ""}
                    </option>
                  ))}
                </select>
                <input
                  ref={carnetFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTemplateUpload(file, "carnet");
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => carnetFileInputRef.current?.click()}
                  disabled={uploadingTemplate === "carnet"}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  title="Subir nueva plantilla de carnet"
                >
                  {uploadingTemplate === "carnet" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </button>
              </div>
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

        {controlNumberWarning && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800">{controlNumberWarning}</p>
              <button
                onClick={() => {
                  setWarningAcknowledged(true);
                  setControlNumberWarning(null);
                }}
                className="text-xs text-yellow-700 underline mt-1"
              >
                Entendido, continuar de todos modos
              </button>
            </div>
          </div>
        )}

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
            <div className="flex gap-3">
              <button
                onClick={() => setIsPreviewOpen(true)}
                disabled={isGenerating || participants.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Eye className="w-4 h-4" />
                Vista Previa
              </button>
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

      <CustomPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        participants={participants}
        certificateData={buildCertificateData()}
        certCoords={certCoords}
        carnetCoords={carnetCoords}
        certTemplatePath={selectedCertTemplate?.archivo
          ? selectedCertTemplate.archivo.startsWith("/")
            ? selectedCertTemplate.archivo.startsWith("/templates/")
              ? selectedCertTemplate.archivo
              : `/templates${selectedCertTemplate.archivo}`
            : `/templates/${selectedCertTemplate.archivo}`
          : ""}
        carnetTemplatePath={selectedCarnetTemplate?.archivo
          ? selectedCarnetTemplate.archivo.startsWith("/")
            ? selectedCarnetTemplate.archivo.startsWith("/templates/")
              ? selectedCarnetTemplate.archivo
              : `/templates${selectedCarnetTemplate.archivo}`
            : `/templates/${selectedCarnetTemplate.archivo}`
          : ""}
        emiteCarnet={!!(selectedCarnetTemplate && selectedCourseTopic?.emite_carnet)}
        generateDocuments={certificateDetails.generate_documents}
        paperSize={certificateDetails.paperSize}
        facilitatorId={certificateDetails.facilitator_id || undefined}
        shaSignatureId={certificateDetails.sha_signature_id || undefined}
        mockOSI={buildMockOSI(manualOSIData)}
      />
    </div>
  );
}
