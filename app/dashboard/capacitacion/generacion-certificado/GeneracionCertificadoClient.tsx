"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import {
  CourseTopic,
  CertificateGeneration,
  CertificateParticipant,
  CertificateOSI,
  CarnetGeneration,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from "./components/certificate-form";
import { CarnetDebug } from "@/components/carnets/carnet-debug";
import {
  saveCertificatesToDatabase,
  updateCertificateAction,
} from "@/app/actions/certificados";
import {
  getCarnetTemplatesAction,
  getCertificateTemplatesAction,
} from "@/app/actions/dropdown-data";
import { QRService } from "@/lib/qr-service";
import { generateDocumentsServer } from "@/lib/document-server-actions";
import {
  getDocumentFileName,
  getDefaultFirmante,
} from "@/lib/document-client-utils";

interface GeneracionCertificadoClientProps {
  user: any;
  initialData: any;
  editData?: any;
}

export default function GeneracionCertificadoClient({
  user,
  initialData,
  editData,
}: GeneracionCertificadoClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    currentPhase: "",
    percentage: 0,
    currentCertificate: 0,
    totalCertificates: 0,
  });
  const [selectedOSI, setSelectedOSI] = useState<CertificateOSI | null>(null);
  const [selectedCourseTopic, setSelectedCourseTopic] =
    useState<CourseTopic | null>(null);
  const [courseTopics, setCourseTopics] = useState<CourseTopic[]>([]);
  const [carnetTemplates, setCarnetTemplates] = useState<any[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([]);
  const [certificateData, setCertificateData] = useState<CertificateGeneration>(
    {
      osi_id: "",
      certificate_title: "",
      certificate_subtitle: "",
      passing_grade: 14,
      course_topic_id: "",
      course_topic_data: undefined,
      course_template_id: undefined,
      course_content: "",
      participants: [],
      location: "",
      date: new Date().toISOString().split("T")[0],
      horas_estimadas: undefined,
      facilitator_id: undefined,
      facilitator_data: undefined,
      sha_signature_id: undefined,
      fecha_vencimiento: undefined,
      id_estado: undefined,
      id_plantilla_certificado: undefined,
      generate_documents: true, // Default to true for convenience
    },
  );

  // Use initial data from server component
  const osis = initialData.osis || [];
  const courses = initialData.courses || [];

  // Comprehensive error handling to ensure we always have a string or null
  const error = (() => {
    if (!initialData.error) return null;

    // If it's already a string, return it
    if (typeof initialData.error === "string") return initialData.error;

    // If it's an object with a message property, return the message
    if (
      initialData.error &&
      typeof initialData.error === "object" &&
      "message" in initialData.error
    ) {
      return initialData.error.message;
    }

    // If it's an object with an error property, return that
    if (
      initialData.error &&
      typeof initialData.error === "object" &&
      "error" in initialData.error
    ) {
      return typeof initialData.error.error === "string"
        ? initialData.error.error
        : "Error occurred";
    }

    // Fallback: convert to string if possible, otherwise return generic error
    try {
      return String(initialData.error);
    } catch {
      return "Error loading data";
    }
  })();

  // Load carnet and certificate templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [carnetResult, certResult] = await Promise.all([
          getCarnetTemplatesAction(),
          getCertificateTemplatesAction(),
        ]);
        if (carnetResult.data) {
          setCarnetTemplates(carnetResult.data);
          // Auto-set the active carnet template if not already set
          const activeCarnetTemplate = carnetResult.data.find(
            (t: any) => t.is_active,
          );
          if (activeCarnetTemplate) {
            setCertificateData((prev) => ({
              ...prev,
              id_plantilla_carnet:
                prev.id_plantilla_carnet || activeCarnetTemplate.id,
            }));
          }
        }
        if (certResult.data) {
          setCertificateTemplates(certResult.data);
          // Auto-set the active certificate template if not already set
          const activeTemplate = certResult.data.find((t: any) => t.is_active);
          if (activeTemplate) {
            setCertificateData((prev) => ({
              ...prev,
              id_plantilla_certificado:
                prev.id_plantilla_certificado || activeTemplate.id,
              plantilla_certificado_archivo:
                prev.plantilla_certificado_archivo || activeTemplate.archivo,
            }));
          }
        }
      } catch (error) {
        // Continue without templates
      }
    };

    loadTemplates();
  }, []);

  // Pre-fill form if in edit mode
  useEffect(() => {
    if (editData && editData.certificate) {
      const { certificate, snapshot } = editData;

      // Find OSI in initialData
      const osi = osis.find(
        (o: any) =>
          o.id === certificate.nro_osi?.toString() ||
          o.nro_osi === certificate.nro_osi,
      );
      if (osi) {
        setSelectedOSI(osi);
      } else if (snapshot?.osi) {
        // Fallback to snapshot data if OSI not in current list
        setSelectedOSI(snapshot.osi);
      }

      // Find Course Topic
      const course = courses.find(
        (c: any) =>
          c.id === certificate.id_curso?.toString() ||
          c.cursos_id === certificate.id_curso,
      );
      if (course) {
        setSelectedCourseTopic(course);
      } else if (snapshot?.curso) {
        setSelectedCourseTopic(snapshot.curso);
      }

      // Populate certificate data
      setCertificateData({
        osi_id: certificate.nro_osi?.toString() || "",
        osi_data: snapshot?.osi || osi,
        certificate_title:
          snapshot?.certificado_detalles?.title ||
          certificate.cursos?.nombre ||
          "",
        certificate_subtitle: snapshot?.certificado_detalles?.subtitle || "",
        passing_grade: snapshot?.certificado_detalles?.passing_grade || 14,
        course_topic_id: certificate.id_curso?.toString() || "",
        course_topic_data: snapshot?.curso || course,
        course_template_id:
          snapshot?.plantilla?.id_plantilla_curso?.toString() ||
          "original-course",
        course_content:
          snapshot?.certificado_detalles?.course_content ||
          certificate.cursos?.contenido ||
          "",
        participants: [
          {
            id: certificate.participantes_certificados?.id,
            name: certificate.participantes_certificados?.nombre || "",
            idNumber: certificate.participantes_certificados?.cedula || "",
            idType: certificate.participantes_certificados?.cedula?.startsWith(
              "E",
            )
              ? "extranjero"
              : "venezolano",
            nationality:
              certificate.participantes_certificados?.nacionalidad ||
              "venezolano",
            score: certificate.calificacion || 0,
            company: certificate.empresas?.razon_social || "",
          },
        ],
        location: snapshot?.certificado_detalles?.location || "Puerto La Cruz",
        date:
          certificate.fecha_emision || new Date().toISOString().split("T")[0],
        horas_estimadas:
          snapshot?.certificado_detalles?.horas_estimadas ||
          certificate.cursos?.horas_estimadas,
        facilitator_id: certificate.id_facilitador?.toString(),
        facilitator_data: snapshot?.firmas?.facilitator_data,
        sha_signature_id: snapshot?.firmas?.sha_signature_id,
        fecha_vencimiento: certificate.fecha_vencimiento || undefined,
        id_estado: certificate.id_estado,
        id_plantilla_certificado: certificate.id_plantilla_certificado,
        plantilla_certificado_archivo:
          snapshot?.plantilla?.archivo_plantilla_certificado,
        generate_documents: false, // Default to false for single edit
      });
    }
  }, [editData, osis, courses]);

  const handleOSISelect = (osi: CertificateOSI | null) => {
    if (osi && osi.has_certificates && !editData) {
      const confirmMsg = `La OSI ${osi.nro_osi} ya tiene certificados generados. ¿Estás seguro de que deseas generar otro lote de certificados para esta misma OSI?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    setSelectedOSI(osi);

    if (osi) {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.id,
        osi_data: osi,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);

      // id_curso is id_servicio from v_osi_formato_completo — direct match against catalogo_servicios.id
      let selectedCourse: CourseTopic | null = null;

      if (osi.id_curso) {
        selectedCourse =
          courses.find(
            (topic: CourseTopic) => topic.id === osi.id_curso!.toString(),
          ) || null;
      }

      // Auto-select the course if found
      if (selectedCourse) {
        const passingGrade = selectedCourse.nota_aprobatoria ?? 14;

        setCertificateData((prev) => ({
          ...prev,
          course_topic_id: selectedCourse.id,
          course_topic_data: selectedCourse,
          // Don't set course_content or course_template_id here — the hook
          // will set them after templates finish loading to avoid race conditions
          course_content: "",
          course_template_id: "",
          passing_grade: passingGrade,
          horas_estimadas: selectedCourse.horas_estimadas,
          certificate_title: selectedCourse.name,
          id_plantilla_certificado:
            selectedCourse.id_plantilla_certificado ||
            prev.id_plantilla_certificado,
        }));
        setSelectedCourseTopic(selectedCourse);
      }
    } else {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: "",
        osi_data: undefined,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
        passing_grade: 14,
      }));
      setSelectedCourseTopic(null);
    }
  };

  const handleCertificateDataChange = (
    field: keyof CertificateGeneration,
    value: any,
  ) => {
    if (field === "course_topic_id") {
      const selectedTopic = courses.find(
        (topic: CourseTopic) => topic.id === value,
      );

      if (selectedTopic) {
        const passingGrade = selectedTopic.nota_aprobatoria ?? 14;

        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_topic_data: selectedTopic,
          course_content: selectedTopic.contenido_curso || "",
          course_template_id: "original-course",
          passing_grade: passingGrade,
          horas_estimadas: selectedTopic.horas_estimadas,
          certificate_title: prev.certificate_title || selectedTopic.name,
          id_plantilla_certificado:
            selectedTopic.id_plantilla_certificado ||
            prev.id_plantilla_certificado,
          fecha_vencimiento: selectedTopic.emite_carnet
            ? prev.fecha_vencimiento
            : undefined,
        }));
        setSelectedCourseTopic(selectedTopic);
      } else {
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_content: "",
          passing_grade: 14,
          fecha_vencimiento: undefined,
        }));
        setSelectedCourseTopic(null);
      }
    } else {
      setCertificateData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleParticipantsChange = (participants: CertificateParticipant[]) => {
    setCertificateData((prev) => ({
      ...prev,
      participants,
    }));
  };

  const handleGenerateCertificate = async () => {
    if (
      !certificateData.osi_id ||
      !certificateData.certificate_title ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    if (
      selectedCourseTopic?.emite_carnet &&
      !certificateData.fecha_vencimiento
    ) {
      alert(
        "Este curso emite carnet, por lo que la fecha de vencimiento es requerida",
      );
      return;
    }

    // Validate content length
    if ((certificateData.course_content?.length || 0) > 2000) {
      alert(
        "El contenido del curso excede el límite de 2000 caracteres. Por favor, reduce el contenido.",
      );
      return;
    }

    try {
      setIsGenerating(true);
      setGenerationProgress({
        currentPhase: editData
          ? "Actualizando certificado..."
          : "Guardando certificados en base de datos...",
        percentage: 5,
        currentCertificate: 0,
        totalCertificates: certificateData.participants.length,
      });

      let dbResult;
      if (editData && editData.certificate) {
        // Update single certificate
        const updateResult = await updateCertificateAction(
          editData.certificate.id,
          certificateData,
          certificateData.participants[0],
        );

        if (!updateResult.success) {
          alert(`Error actualizando certificado: ${updateResult.message}`);
          return;
        }

        dbResult = {
          success: true,
          certificateIds: [editData.certificate.id],
          certificateNumbers: [
            {
              id: editData.certificate.id,
              nro_libro: editData.certificate.nro_libro,
              nro_hoja: editData.certificate.nro_hoja,
              nro_linea: editData.certificate.nro_linea,
              nro_control: editData.certificate.nro_control,
            },
          ],
          participantIds: [editData.certificate.id_participante],
        };
      } else {
        // Create new certificates
        dbResult = await saveCertificatesToDatabase(
          certificateData,
          certificateData.participants,
        );
      }

      if (!dbResult.success) {
        alert(
          `Error guardando certificados en base de datos: ${dbResult.message}`,
        );
        return;
      }

      if (
        !dbResult.certificateNumbers ||
        dbResult.certificateNumbers.length === 0
      ) {
        alert(
          "Error: No se pudieron obtener los números de control de la base de datos",
        );
        return;
      }

      // Use existing certificate generation
      const { CertificateGenerator } =
        await import("@/lib/certificate-generator");
      const certificateGenerator = new CertificateGenerator();

      setGenerationProgress({
        currentPhase: "Cargando assets...",
        percentage: 10,
        currentCertificate: 0,
        totalCertificates: certificateData.participants.length,
      });

      // Determine certificate template image URL from active template
      let templateImageUrl = "/templates/certificado.png"; // fallback
      if (
        certificateData.id_plantilla_certificado &&
        certificateTemplates.length > 0
      ) {
        const selectedCertTemplate = certificateTemplates.find(
          (t: any) => t.id === certificateData.id_plantilla_certificado,
        );
        if (selectedCertTemplate?.archivo) {
          templateImageUrl = `/templates/${selectedCertTemplate.archivo}`;
        }
      } else if (certificateData.plantilla_certificado_archivo) {
        templateImageUrl = `/templates/${certificateData.plantilla_certificado_archivo}`;
      }
      const sealImageUrl = "/templates/sello.png";

      // Helper function to preload images as base64
      async function preloadImage(url: string): Promise<string> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Pre-fetch shared assets once before generation loop

      // Fetch facilitator data once
      let facilitatorData: any = null;
      let facilitatorSignatureBase64 = "";
      if (certificateData.facilitator_id) {
        const facilitatorResponse = await fetch(
          `/api/facilitators/${certificateData.facilitator_id}`,
        );
        facilitatorData = await facilitatorResponse.json();

        // Preload facilitator signature if available
        if (facilitatorData?.firmas?.url_imagen) {
          try {
            facilitatorSignatureBase64 = await preloadImage(
              facilitatorData.firmas.url_imagen,
            );
          } catch (error) {
            console.error("Failed to preload facilitator signature:", error);
          }
        }
      }

      // Preload seal image
      let selloBase64 = "";
      try {
        selloBase64 = await preloadImage(sealImageUrl);
      } catch (error) {
        console.error("Failed to preload seal image:", error);
      }

      // Preload template image
      let templateBase64 = "";
      try {
        templateBase64 = await preloadImage(templateImageUrl);
      } catch (error) {
        console.error("Failed to preload template image:", error);
      }

      // Preload SHA signature if available
      let shaSignatureBase64 = "";
      let shaSignatureDataToUse = certificateData.sha_signature_data;

      // If missing data but we have an ID, try to fetch it or find it from initialData
      if (!shaSignatureDataToUse && certificateData.sha_signature_id) {
        try {
          const response = await fetch(
            `/api/signatures/${certificateData.sha_signature_id}`,
          );
          if (response.ok) {
            shaSignatureDataToUse = await response.json();
          }
        } catch (error) {
          console.error("Failed to fetch SHA signature data:", error);
        }
      }

      if (shaSignatureDataToUse?.url_imagen) {
        try {
          shaSignatureBase64 = await preloadImage(
            shaSignatureDataToUse.url_imagen,
          );
        } catch (error) {
          console.error("Failed to preload SHA signature:", error);
        }
      }

      console.log("Assets loaded. Starting batch generation...");

      setGenerationProgress({
        currentPhase: "Generando certificados...",
        percentage: 15,
        currentCertificate: 0,
        totalCertificates: certificateData.participants.length,
      });

      // Prepare data for additional documents (available before generation starts)
      const certificateRecords = certificateData.participants.map(
        (participant, index) => ({
          participant_name: participant.name,
          participant_id_number: participant.idNumber,
          participant_id_type: participant.idType,
          participant_nationality: participant.nationality,
          course_title: certificateData.certificate_title,
          company_name: selectedOSI?.cliente_nombre_empresa || "",
          osi_number: selectedOSI?.nro_osi || "",
          city: certificateData.location || "Puerto La Cruz",
          location: certificateData.location || "",
          execution_address: selectedOSI?.direccion_ejecucion || "",
          execution_date: selectedOSI?.fecha_ejecucion1 || certificateData.date,
          score: participant.score || 14,
          control_number:
            dbResult.certificateNumbers![index]?.nro_control?.toString() || "",
        }),
      );

      // Start additional document generation in parallel
      const additionalDocsPromise = certificateData.generate_documents
        ? (async () => {
            try {
              const result = await generateDocumentsServer({
                certificates: certificateRecords,
                osiData: selectedOSI || {},
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
              return result;
            } catch (error) {
              return {
                success: false,
                message:
                  error instanceof Error ? error.message : "Unknown error",
              };
            }
          })()
        : Promise.resolve(null);

      // Generate certificates concurrently in batches
      const certificates: { participant: any; blob: Blob }[] = [];
      const failedCertificates: { participant: any; error: any }[] = [];
      const BATCH_SIZE = 5;

      for (
        let i = 0;
        i < certificateData.participants.length;
        i += BATCH_SIZE
      ) {
        const batch = certificateData.participants.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (participant, index) => {
          const actualIndex = i + index;
          const controlNumbers = dbResult.certificateNumbers![actualIndex];

          try {
            const blob = await certificateGenerator.generateCertificate({
              participant,
              certificateData,
              templateImage: templateBase64 || templateImageUrl,
              sealImage: selloBase64 || sealImageUrl,
              controlNumbers,
              isPreview: false,
              certificateId: dbResult.certificateIds![actualIndex],
              preloadedAssets: {
                facilitator: facilitatorData,
                facilitatorSignature: facilitatorSignatureBase64,
                shaSignature: shaSignatureBase64,
              },
            });
            return { success: true, participant, blob };
          } catch (error) {
            console.error(
              `Failed to generate certificate for participant ${participant.name}:`,
              error,
            );
            return { success: false, participant, error };
          }
        });

        const results = await Promise.all(batchPromises);

        results.forEach((result) => {
          if (result.success) {
            certificates.push({
              participant: result.participant,
              blob: result.blob!,
            });
          } else {
            failedCertificates.push({
              participant: result.participant,
              error: result.error,
            });
          }
        });

        // Update progress after each batch
        const completedCount = Math.min(
          i + BATCH_SIZE,
          certificateData.participants.length,
        );
        const progressPercentage =
          15 + (completedCount / certificateData.participants.length) * 50;
        setGenerationProgress({
          currentPhase: `Generando certificados... (${completedCount}/${certificateData.participants.length})`,
          percentage: progressPercentage,
          currentCertificate: completedCount,
          totalCertificates: certificateData.participants.length,
        });
      }

      // Notify user about failed certificates
      if (failedCertificates.length > 0) {
        const failedNames = failedCertificates
          .map((f) => f.participant.name)
          .join(", ");
        alert(
          `Error: ${failedCertificates.length} certificate(s) failed to generate: ${failedNames}. Please check the console for details.`,
        );
      }

      // Generate carnets if course requires them
      let carnetsGenerated = 0;
      const carnetBlobs: { participant: any; blob: Blob }[] = [];
      if (selectedCourseTopic?.emite_carnet) {
        setGenerationProgress({
          currentPhase: "Generando carnets...",
          percentage: 65,
          currentCertificate: certificateData.participants.length,
          totalCertificates: certificateData.participants.length,
        });

        try {
          const { CarnetGenerator } = await import("@/lib/carnet-generator");
          const carnetGenerator = new CarnetGenerator();

          // Prepare carnet data for all participants
          const carnetData: CarnetGeneration[] =
            certificateData.participants.map((participant, index) => {
              return {
                id_certificado: dbResult.certificateIds![index],
                id_participante: dbResult.participantIds?.[index] || 0, // Use REAL database ID
                id_empresa: selectedOSI?.empresa_id || null,
                id_curso: certificateData.course_topic_data?.cursos_id ?? null, // FK → cursos; cursos_id holds the real cursos.id
                id_osi: null, // nro_osi is the reference; stored in snapshot_contenido. carnets.id_osi FK → osi not applicable here.
                titulo_curso: certificateData.certificate_title,
                fecha_emision: certificateData.date,
                fecha_vencimiento: certificateData.fecha_vencimiento || null,
                nombre_participante: participant.name,
                cedula_participante: participant.idNumber,
                empresa_participante: participant.company || null,
                nro_control: dbResult.certificateNumbers![index].nro_control,
              };
            });

          const carnetActions = await import("@/app/actions/carnets");
          let carnetDbResult;

          if (editData) {
            // Update existing carnet
            const updateResult = await carnetActions.updateCarnetAction(
              dbResult.certificateIds![0],
              carnetData[0],
            );
            carnetDbResult = {
              success: updateResult.success,
              message: (updateResult as any).message || "",
              carnetIds: updateResult.carnetId ? [updateResult.carnetId] : [],
            };
          } else {
            // Create new carnets
            carnetDbResult = await carnetActions.saveCarnetsToDatabase(
              carnetData,
              dbResult.certificateIds!,
            );
          }

          if (carnetDbResult.success && carnetDbResult.carnetIds) {
            // Generate carnet PDFs concurrently in batches
            const carnetRequests = carnetData.map((carnet, index) => {
              // Get template image based on selected carnet template
              const defaultTemplate = "/templates/carnet.png";
              let templateImage = defaultTemplate;

              if (certificateData.id_plantilla_carnet) {
                const selectedTemplate = carnetTemplates.find(
                  (template: any) =>
                    template.id === certificateData.id_plantilla_carnet,
                );
                if (
                  selectedTemplate?.archivo &&
                  selectedTemplate.archivo !== "carnet.png"
                ) {
                  // Try to use custom template, carnet generator will fallback if it doesn't exist
                  templateImage = `/templates/${selectedTemplate.archivo}`;
                }
              }

              return {
                participant: certificateData.participants[index],
                carnetData: carnet,
                templateImage,
                isPreview: false,
                carnetId: carnetDbResult.carnetIds![index],
              };
            });

            // Generate carnet PDFs in batches
            const CARNET_BATCH_SIZE = 5;
            for (let i = 0; i < carnetRequests.length; i += CARNET_BATCH_SIZE) {
              const batch = carnetRequests.slice(i, i + CARNET_BATCH_SIZE);

              const batchPromises = batch.map(async (carnetReq, index) => {
                const actualIndex = i + index;

                // Generate QR code for carnet using the certificate ID
                let qrDataURL: string | undefined;
                try {
                  const certificateId = dbResult.certificateIds![actualIndex];
                  const qrData = QRService.generateQRData(certificateId);
                  qrDataURL = await QRService.generateQRDataURL({
                    data: qrData,
                    size: 60,
                    level: "M",
                    includeMargin: true,
                  });
                } catch (qrError) {
                  // Continue without QR code - carnet generator will use placeholder
                }

                const carnetReqWithQR = {
                  ...carnetReq,
                  qrDataURL,
                };

                try {
                  const blob =
                    await carnetGenerator.generateCarnet(carnetReqWithQR);
                  return {
                    success: true,
                    participant: carnetReq.participant,
                    blob,
                  };
                } catch (error) {
                  console.error(
                    `Failed to generate carnet for participant ${carnetReq.participant.name}:`,
                    error,
                  );
                  return {
                    success: false,
                    participant: carnetReq.participant,
                    error,
                  };
                }
              });

              const results = await Promise.all(batchPromises);

              results.forEach((result) => {
                if (result.success) {
                  carnetBlobs.push({
                    participant: result.participant,
                    blob: result.blob!,
                  });
                }
              });

              // Update progress after each carnet batch
              const completedCount = Math.min(
                i + CARNET_BATCH_SIZE,
                carnetRequests.length,
              );
              const progressPercentage =
                65 + (completedCount / carnetRequests.length) * 10;
              setGenerationProgress({
                currentPhase: `Generando carnets... (${completedCount}/${carnetRequests.length})`,
                percentage: progressPercentage,
                currentCertificate: certificateData.participants.length,
                totalCertificates: certificateData.participants.length,
              });
            }

            carnetsGenerated = carnetBlobs.length;
          } else {
            alert(
              `Error guardando carnets en base de datos: ${carnetDbResult.message}`,
            );
          }
        } catch (error) {
          alert(
            "Error generando carnets. Los certificados se generaron correctamente. Error: " +
              (error instanceof Error ? error.message : "Unknown error"),
          );
        }
      }

      // Generate and download additional documents (already running in parallel)
      let documentsGenerated = 0;
      let additionalDocsData: { [key: string]: string } | null = null;

      setGenerationProgress({
        currentPhase: "Generando documentos adicionales...",
        percentage: 75,
        currentCertificate: certificateData.participants.length,
        totalCertificates: certificateData.participants.length,
      });

      try {
        const additionalDocsResult = await additionalDocsPromise;

        if (
          additionalDocsResult &&
          "success" in additionalDocsResult &&
          additionalDocsResult.success &&
          "documents" in additionalDocsResult &&
          additionalDocsResult.documents
        ) {
          additionalDocsData = additionalDocsResult.documents;
          documentsGenerated = Object.keys(
            additionalDocsResult.documents,
          ).length;
        }
      } catch (error) {
        // Don't show alert for document errors since certificates/carnets were generated successfully
      }

      setGenerationProgress({
        currentPhase: "Creando archivo ZIP...",
        percentage: 85,
        currentCertificate: certificateData.participants.length,
        totalCertificates: certificateData.participants.length,
      });

      // Initialize JSZip and create folders
      const zip = new JSZip();
      const certFolder = zip.folder("Certificados");
      const docsFolder = zip.folder("Documentos_Adicionales");
      const carnetsFolder = zip.folder("Carnets");

      // Add certificates to ZIP
      for (const { participant, blob } of certificates) {
        const filename = `certificado_${participant.name.replace(/\s+/g, "_")}_${participant.idNumber}.pdf`;
        certFolder?.file(filename, blob);
      }

      // Add carnets to ZIP if generated
      for (const { participant, blob } of carnetBlobs) {
        const filename = `carnet_${participant.name.replace(/\s+/g, "_")}_${participant.idNumber}.pdf`;
        carnetsFolder?.file(filename, blob);
      }

      // Add additional documents to ZIP
      if (additionalDocsData) {
        const documentEntries = Object.entries(additionalDocsData);
        for (const [docType, base64String] of documentEntries) {
          const filename = getDocumentFileName(docType, selectedOSI?.nro_osi);
          docsFolder?.file(filename, base64String, { base64: true });
        }
      }

      // Generate and download the ZIP file
      try {
        setGenerationProgress({
          currentPhase: "Descargando archivo...",
          percentage: 95,
          currentCertificate: certificateData.participants.length,
          totalCertificates: certificateData.participants.length,
        });

        const zipBlob = await zip.generateAsync({
          type: "blob",
          compression: "STORE", // Skip compression for PDFs (already compressed)
        });
        const batchName = selectedOSI?.nro_osi
          ? `OSI_${selectedOSI.nro_osi}`
          : "Lote";
        const zipFilename = `Certificados_y_Documentos_${batchName}.zip`;

        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setGenerationProgress({
          currentPhase: "¡Completado!",
          percentage: 100,
          currentCertificate: certificateData.participants.length,
          totalCertificates: certificateData.participants.length,
        });
      } catch (error) {
        console.error("Error bundling files into ZIP:", error);
        alert("Error creando archivo ZIP. Por favor intente nuevamente.");
      }

      const documentText =
        documentsGenerated > 0
          ? ` y ${documentsGenerated} documentos adicionales`
          : "";

      const successMessage = editData
        ? `¡Certificado ${carnetsGenerated > 0 ? "y carnet " : ""}actualizado exitosamente!`
        : `Se generaron y guardaron ${certificates.length} certificados${carnetsGenerated > 0 ? ` y ${carnetsGenerated} carnets` : ""}${documentText} exitosamente!`;
      alert(successMessage);

      if (editData) {
        router.push("/dashboard/capacitacion/gestion-certificados");
        return;
      }

      // Reset form
      setCertificateData({
        osi_id: "",
        certificate_title: "",
        certificate_subtitle: "",
        passing_grade: 14,
        course_topic_id: "",
        course_content: "",
        course_template_id: undefined,
        participants: [],
        location: "",
        date: new Date().toISOString().split("T")[0],
        horas_estimadas: undefined,
        facilitator_id: undefined,
        facilitator_data: undefined,
        sha_signature_id: undefined,
        fecha_vencimiento: undefined,
        id_estado: undefined,
        id_plantilla_certificado: undefined,
        plantilla_certificado_archivo: undefined,
        generate_documents: true, // Reset to default
      });
      setSelectedOSI(null);
      setSelectedCourseTopic(null);

      // Refresh the page data to update 'Generated' badges in the OSI list
      router.refresh();
    } catch (error) {
      alert("Error generando certificados. Por favor intente nuevamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error al cargar los datos
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || "Error desconocido"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {editData
            ? "Edición/Reedición de Certificado"
            : "Generación de Certificados"}
        </h1>
        <p className="mt-2 text-gray-600">
          {editData
            ? "Modifica los datos del certificado existente. Los números de control se mantendrán."
            : "Crea certificados personalizados para los participantes de capacitaciones"}
        </p>
      </div>

      <div className="space-y-6">
        {/* <CarnetDebug 
          selectedCourseTopic={selectedCourseTopic} 
          certificateData={certificateData} 
        /> */}

        <OSISearch
          osis={osis}
          selectedOSI={selectedOSI}
          onSelect={handleOSISelect}
          matchedCourse={selectedCourseTopic}
          allCourses={courses}
          disabled={!!editData}
        />

        <CertificateForm
          certificateData={certificateData}
          selectedOSI={selectedOSI}
          selectedCourseTopic={selectedCourseTopic}
          courseTopics={courses}
          isGenerating={isGenerating}
          isEditMode={!!editData}
          generationProgress={generationProgress}
          onDataChange={handleCertificateDataChange}
          onParticipantsChange={handleParticipantsChange}
          onGenerate={handleGenerateCertificate}
        />
      </div>
    </div>
  );
}
