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
  ManualOSIInput,
  Empresa,
  City,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from "./components/certificate-form";
import { ManualOSIInput as ManualOSIInputComponent } from "./components/manual-osi-input";
import { CarnetDebug } from "@/components/carnets/carnet-debug";
import {
  saveCertificatesToDatabase,
  updateCertificateAction,
  getPreviousParticipantsByOSIAction,
} from "@/app/actions/certificados";
import {
  getCarnetTemplatesAction,
  getCertificateTemplatesAction,
} from "@/app/actions/dropdown-data";
import { getCompaniesAndCities } from "@/app/actions/companies-cities";
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

  // Manual mode state
  const [osiInputMode, setOsiInputMode] = useState<"automatic" | "manual">(
    "automatic",
  );
  const [manualOSIData, setManualOSIData] = useState<ManualOSIInput>({});
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [hasAttemptedManualSubmission, setHasAttemptedManualSubmission] =
    useState(false);
  const [manualOSIHasAnyCertificates, setManualOSIHasAnyCertificates] =
    useState(false);
  const [manualOSIHasCourseCertificates, setManualOSIHasCourseCertificates] =
    useState(false);
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
      fecha_vencimiento: (() => {
        const exp = new Date();
        exp.setFullYear(exp.getFullYear() + 2);
        return exp.toISOString().split("T")[0];
      })(),
      id_estado: undefined,
      id_plantilla_certificado: undefined,
      generate_documents: true, // Always true
      include_previous_participants: true, // Default to true as per user preference
      paperSize: "half-letter-custom", // New default format
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
        const [carnetResult, certResult, companiesCitiesResult] =
          await Promise.all([
            getCarnetTemplatesAction(),
            getCertificateTemplatesAction(),
            getCompaniesAndCities(),
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
        if (companiesCitiesResult.success) {
          setCompanies(companiesCitiesResult.companies || []);
          setCities(companiesCitiesResult.cities || []);
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
          certificate.cursos?.contenido_curso ||
          "",
        participants: [
          {
            id: certificate.participantes_certificados?.id,
            name: certificate.participantes_certificados?.nombre || "",
            idNumber: certificate.participantes_certificados?.cedula || "",
            idType:
              certificate.participantes_certificados?.nacionalidad ===
                "extranjero" ||
              certificate.participantes_certificados?.cedula?.startsWith("E")
                ? "E-"
                : "V-",
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

  // Effect to sync course content when selectedCourseTopic changes
  useEffect(() => {
    if (selectedCourseTopic && !editData) {
      setCertificateData((prev) => ({
        ...prev,
        course_content: selectedCourseTopic.contenido_curso || "",
        certificate_title: prev.certificate_title || selectedCourseTopic.nombre,
      }));
    }
  }, [selectedCourseTopic?.id, selectedCourseTopic?.contenido_curso, editData]);

  const handleOSISelect = (osi: CertificateOSI | null) => {
    if (osi && osi.has_certificates && !editData) {
      const confirmMsg = `La OSI ${osi.nro_osi} ya tiene certificados generados. ¿Estás seguro de que deseas generar otro lote de certificados para esta misma OSI?`;
      if (!confirm(confirmMsg)) {
        return;
      }
    }

    setSelectedOSI(osi);

    if (osi) {
      // Determine default date from OSI
      const osiDate =
        osi.fecha_emision ||
        osi.fecha_servicio ||
        new Date().toISOString().split("T")[0];
      const formattedDate =
        typeof osiDate === "string"
          ? osiDate.split("T")[0]
          : new Date(osiDate).toISOString().split("T")[0];

      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.id,
        osi_data: osi,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
        date: formattedDate,
      }));
      setSelectedCourseTopic(null);

      // id_curso is id_servicio from v_osi_formato_completo — direct match against catalogo_servicios.id
      let selectedCourse: CourseTopic | null = null;

      // 1. Try ID matching (direct from view)
      if (osi.id_curso) {
        selectedCourse =
          courses.find(
            (topic: CourseTopic) => topic.id === osi.id_curso!.toString(),
          ) || null;
      }

      // 2. Try Name matching as fallback (Manejo defensivo, etc.)
      if (!selectedCourse && (osi.curso_nombre || osi.detalle_capacitacion)) {
        const targetName = (
          osi.curso_nombre ||
          osi.detalle_capacitacion ||
          ""
        ).toLowerCase();
        selectedCourse =
          courses.find(
            (topic: CourseTopic) =>
              topic.nombre.toLowerCase() === targetName ||
              topic.name.toLowerCase() === targetName,
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

  // Helper function to build mock OSI object from manual inputs
  const buildMockOSI = (manualData: ManualOSIInput): CertificateOSI => {
    // If company_id is set but company_name is not, look up the company name from the companies array
    let companyName = manualData.company_name || "";
    if (!companyName && manualData.company_id) {
      // Handle both string and numeric IDs for comparison
      const company = companies.find(
        (c) => c.id.toString() === (manualData.company_id?.toString() || ""),
      );
      if (company) {
        companyName = company.razon_social || "";
        console.log(
          "Looking up company name from company_id:",
          manualData.company_id,
          "found:",
          companyName,
        );
      }
    }
    console.log(
      "buildMockOSI - company_id:",
      manualData.company_id,
      "company_name:",
      manualData.company_name,
      "final companyName:",
      companyName,
    );

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
      // Add other required fields with sensible defaults
    };
  };

  // Handler for manual OSI data changes
  const handleManualOSIDataChange = (
    field: keyof ManualOSIInput,
    value: any,
  ) => {
    setManualOSIData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Synchronize manualOSIData with selectedOSI in manual mode reactively
  // This allows the CourseTemplate hook in CertificateForm to detect company/course changes
  useEffect(() => {
    if (
      osiInputMode === "manual" &&
      (manualOSIData.company_id || manualOSIData.osi_number || manualOSIData.city_id)
    ) {
      const mockOSI = buildMockOSI(manualOSIData);

      // Update selectedOSI for the hook in CertificateForm
      setSelectedOSI((prev) => {
        // Only update if actually different to prevent unnecessary re-renders
        if (
          prev &&
          prev.id === mockOSI.id &&
          prev.empresa_id === mockOSI.empresa_id &&
          prev.nro_osi === mockOSI.nro_osi &&
          prev.id_ciudad === mockOSI.id_ciudad &&
          prev.has_certificates === mockOSI.has_certificates
        ) {
          return prev;
        }
        return mockOSI;
      });

      // Update certificateData to ensure it has the latest OSI data
      setCertificateData((prev) => {
        if (
          prev.osi_id === mockOSI.id &&
          prev.osi_data?.empresa_id === mockOSI.empresa_id &&
          prev.osi_data?.nro_osi === mockOSI.nro_osi
        ) {
          return prev;
        }
        return {
          ...prev,
          osi_id: mockOSI.id,
          osi_data: mockOSI,
          manual_mode: true,
          manual_osi_data: manualOSIData,
        };
      });
    }
  }, [
    osiInputMode,
    manualOSIData,
    manualOSIHasAnyCertificates,
    manualOSIHasCourseCertificates,
  ]);

  // Handler for preview - build mock OSI if in manual mode
  const handlePreview = async () => {
    if (osiInputMode === "manual") {
      // Always validate manual data in manual mode
      // Check for truthy values (not just non-null/undefined)
      const missingFields = [];
      if (!manualOSIData.osi_number?.trim()) {
        missingFields.push("Número OSI");
      }
      // Check for either company_id (from dropdown) or company_name (manual input)
      if (!manualOSIData.company_id && !manualOSIData.company_name?.trim()) {
        missingFields.push("Empresa");
      }
      if (!manualOSIData.city_id) {
        missingFields.push("Ciudad");
      }

      if (missingFields.length > 0) {
        alert(
          `Por favor completa los siguientes campos del modo manual: ${missingFields.join(", ")}`,
        );
        return false;
      }

      // Build mock OSI for preview in manual mode
      const mockOSI = buildMockOSI(manualOSIData);
      setSelectedOSI(mockOSI);
      setCertificateData((prev) => ({
        ...prev,
        osi_id: mockOSI.id,
        osi_data: mockOSI,
        manual_mode: true,
        manual_osi_data: manualOSIData,
      }));
      // Wait a tick for state to update
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return true;
  };

  const handleModeSwitch = (mode: "automatic" | "manual") => {
    // Warn if data has been entered
    if (osiInputMode === "automatic" && selectedOSI) {
      if (
        !confirm("Cambiar de modo borrará la OSI seleccionada. ¿Continuar?")
      ) {
        return;
      }
    }
    if (
      osiInputMode === "manual" &&
      (manualOSIData.osi_number || manualOSIData.company_name)
    ) {
      if (
        !confirm(
          "Cambiar de modo borrará los datos ingresados manualmente. ¿Continuar?",
        )
      ) {
        return;
      }
    }

    setOsiInputMode(mode);
    setSelectedOSI(null);
    setManualOSIData({});
    setSelectedCourseTopic(null);
    setCertificateData((prev) => ({
      ...prev,
      osi_id: "",
      osi_data: undefined,
      course_topic_id: "",
      course_topic_data: undefined,
      course_content: "",
      manual_mode: mode === "manual",
      manual_osi_data: mode === "manual" ? {} : undefined,
      date: new Date().toISOString().split("T")[0],
    }));
  };

  const handleGenerateCertificate = async () => {
    // Manual mode validation
    if (osiInputMode === "manual") {
      setHasAttemptedManualSubmission(true);
      // Check for either company_id (from dropdown) or company_name (manual input)
      if (
        !manualOSIData.osi_number ||
        (!manualOSIData.company_id && !manualOSIData.company_name) ||
        !manualOSIData.city_id
      ) {
        alert(
          "Por favor completa todos los campos obligatorios del modo manual",
        );
        return;
      }

      // Warning for existing certificates in manual mode
      const hasCerts =
        manualOSIHasCourseCertificates || manualOSIHasAnyCertificates;
      if (hasCerts && !editData) {
        const confirmMsg = `La OSI ${manualOSIData.osi_number} ya tiene certificados generados. ¿Estás seguro de que deseas generar otro lote de certificados para esta misma OSI?`;
        if (!confirm(confirmMsg)) {
          return;
        }
      }

      // Build mock OSI and set it
      const mockOSI = buildMockOSI(manualOSIData);
      setSelectedOSI(mockOSI);
      setCertificateData((prev) => ({
        ...prev,
        osi_id: mockOSI.id,
        osi_data: mockOSI,
        manual_mode: true,
        manual_osi_data: manualOSIData,
      }));
    }

    if (
      (!certificateData.manual_mode && !certificateData.osi_id) ||
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

      // Prepare data for additional documents with control numbers
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
          execution_date: certificateData.date,
          control_number: dbResult.certificateNumbers![index]?.nro_control,
          score: participant.score,
        }),
      );

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
      // Priority: initialData.activeCertificateTemplate (from server) > certificateData.id_plantilla_certificado > default
      let templateImageUrl = "/templates/certificado.png"; // fallback

      if (initialData.activeCertificateTemplate?.archivo) {
        templateImageUrl = `/templates/${initialData.activeCertificateTemplate.archivo.toLowerCase()}`;
      } else if (
        certificateData.id_plantilla_certificado &&
        certificateTemplates.length > 0
      ) {
        const selectedCertTemplate = certificateTemplates.find(
          (t: any) => t.id === certificateData.id_plantilla_certificado,
        );
        if (selectedCertTemplate?.archivo) {
          templateImageUrl = `/templates/${selectedCertTemplate.archivo.toLowerCase()}`;
        }
      } else if (certificateData.plantilla_certificado_archivo) {
        templateImageUrl = `/templates/${certificateData.plantilla_certificado_archivo.toLowerCase()}`;
      }

      const sealImageUrl = "/templates/sello.png";

      // Helper function to preload images as base64 standard PNG.
      // Uses canvas conversion to normalise palette/indexed PNGs (colour type 3)
      // that jsPDF cannot render, without any CORS risk (data: URL never taints canvas).
      async function preloadImage(url: string): Promise<string> {
        // Convert relative URLs to absolute URLs for production compatibility
        const absoluteUrl = url.startsWith("http")
          ? url
          : `${window.location.origin}${url}`;
        const response = await fetch(absoluteUrl);
        if (!response.ok) {
          throw new Error(
            `Failed to load image: ${absoluteUrl} (${response.status})`,
          );
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const originalDataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || 1;
                canvas.height = img.naturalHeight || 1;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  resolve(originalDataUrl);
                  return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
              } catch {
                resolve(originalDataUrl);
              }
            };
            img.onerror = () => resolve(originalDataUrl);
            img.src = originalDataUrl;
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Pre-fetch shared assets in parallel before generation loop
      let facilitatorData: any = null;
      let facilitatorSignatureBase64 = "";
      let selloBase64 = "";
      let templateBase64 = "";
      let shaSignatureBase64 = "";
      let shaSignatureDataToUse = certificateData.sha_signature_data;

      setGenerationProgress({
        currentPhase: "Cargando recursos...",
        percentage: 10,
        currentCertificate: 0,
        totalCertificates: certificateData.participants.length,
      });

      const assetPromises = [];

      // 1. Facilitator data and signature
      if (certificateData.facilitator_id) {
        assetPromises.push(
          (async () => {
            try {
              const facilitatorResponse = await fetch(
                `/api/facilitators/${certificateData.facilitator_id}`,
              );
              facilitatorData = await facilitatorResponse.json();

              // Check for base64 image first (new column - no preloading needed)
              if (facilitatorData?.signature_data?.imagen_base64) {
                facilitatorSignatureBase64 = `data:image/png;base64,${facilitatorData.signature_data.imagen_base64}`;
              }
              // Fall back to URL fields if base64 not available
              else if (
                facilitatorData?.signature_data?.url_imagen ||
                facilitatorData?.signature_data?.firma
              ) {
                const signatureUrl =
                  facilitatorData.signature_data.url_imagen ||
                  facilitatorData.signature_data.firma;
                facilitatorSignatureBase64 = await preloadImage(signatureUrl);
              }
              // Legacy fallback
              else if (facilitatorData?.firma) {
                facilitatorSignatureBase64 = await preloadImage(
                  facilitatorData.firma,
                );
              }
            } catch (error) {
              console.error("Failed to preload facilitator assets:", error);
            }
          })(),
        );
      }

      // 2. Seal image
      assetPromises.push(
        (async () => {
          try {
            selloBase64 = await preloadImage(sealImageUrl);
          } catch (error) {
            console.error("Failed to preload seal image:", error);
          }
        })(),
      );

      // 3. Template image
      assetPromises.push(
        (async () => {
          try {
            try {
              templateBase64 = await preloadImage(templateImageUrl);
            } catch (preloadError) {
              console.warn(
                `Failed to preload custom certificate template ${templateImageUrl}, falling back to default`,
                preloadError,
              );
              if (templateImageUrl !== "/templates/certificado.png") {
                templateImageUrl = "/templates/certificado.png";
                templateBase64 = await preloadImage(templateImageUrl);
              } else {
                throw preloadError;
              }
            }
          } catch (error) {
            console.error("Failed to preload template image:", error);
          }
        })(),
      );

      // 4. SHA Signature
      assetPromises.push(
        (async () => {
          try {
            // Priority: certificateData.sha_signature_data > certificateData.sha_signature_id > active from server
            if (certificateData.sha_signature_data) {
              shaSignatureDataToUse = certificateData.sha_signature_data;
            }

            // If still no data, try the ID from certificateData
            if (!shaSignatureDataToUse && certificateData.sha_signature_id) {
              const response = await fetch(
                `/api/signatures/${certificateData.sha_signature_id}`,
              );
              if (response.ok) {
                shaSignatureDataToUse = await response.json();
              }
            }

            // If still no data, use the active SHA signature from server
            if (!shaSignatureDataToUse && initialData.signatures) {
              const activeShaFromServer = initialData.signatures.find(
                (sig: any) => sig.tipo === "representante_sha" && sig.is_active,
              );
              if (activeShaFromServer) {
                shaSignatureDataToUse = activeShaFromServer;
              }
            }

            // Preload the image if we have the URL
            if (shaSignatureDataToUse) {
              const imageUrl =
                (shaSignatureDataToUse as any).url_imagen ||
                (shaSignatureDataToUse as any).firma;
              if (imageUrl) {
                try {
                  shaSignatureBase64 = await preloadImage(imageUrl);
                } catch (preloadError) {
                  console.warn(
                    `Failed to preload primary SHA signature: ${imageUrl}. Attempting to find a fallback.`,
                  );

                  // Fallback: Fetch all signatures and try to find another active representante_sha
                  try {
                    const allSigsResponse = await fetch("/api/signatures");
                    if (allSigsResponse.ok) {
                      const allSigs = await allSigsResponse.json();
                      const otherSigs = allSigs.filter(
                        (sig: any) =>
                          sig.tipo === "representante_sha" &&
                          sig.is_active &&
                          sig.id !== shaSignatureDataToUse?.id,
                      );

                      for (const sig of otherSigs) {
                        const fallBackUrl = sig.url_imagen || sig.firma;
                        if (fallBackUrl) {
                          try {
                            shaSignatureBase64 =
                              await preloadImage(fallBackUrl);
                            if (shaSignatureBase64) {
                              console.log(
                                `Successfully fell back to SHA signature: ${fallBackUrl}`,
                              );
                              shaSignatureDataToUse = sig; // Update the data to use as well
                              break;
                            }
                          } catch (e) {
                            // Try next one
                          }
                        }
                      }
                    }
                  } catch (fallbackError) {
                    console.error(
                      "Failed to fetch fallback signatures",
                      fallbackError,
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error("Failed to preload SHA signature:", error);
          }
        })(),
      );

      await Promise.all(assetPromises);

      console.log("Assets loaded. Starting batch generation...");

      setGenerationProgress({
        currentPhase: "Generando certificados...",
        percentage: 15,
        currentCertificate: 0,
        totalCertificates: certificateData.participants.length,
      });

      // Start additional document generation in parallel
      const additionalDocsPromise = certificateData.generate_documents
        ? (async () => {
            try {
              // 🔍 FETCH PREVIOUS PARTICIPANTS FOR THIS OSI AND COURSE IF ENABLED
              let allParticipants = [...certificateRecords];

              if (
                certificateData.include_previous_participants !== false &&
                selectedOSI?.nro_osi &&
                selectedCourseTopic?.id
              ) {
                const nroOsiNum = parseInt(
                  selectedOSI.nro_osi.replace(/[^\d]/g, ""),
                );
                const courseIdNum = parseInt(selectedCourseTopic.id);

                if (!isNaN(nroOsiNum) && !isNaN(courseIdNum)) {
                  const previousResult =
                    await getPreviousParticipantsByOSIAction(
                      nroOsiNum,
                      courseIdNum,
                    );

                  if (
                    previousResult.success &&
                    previousResult.data &&
                    previousResult.data.length > 0
                  ) {
                    console.log(
                      `Merging ${previousResult.data.length} previous participants into additional documents`,
                    );

                    // Filter out any duplicates if the user is regenerating someone in the current batch
                    const existingCidNumbers = new Set(
                      certificateRecords.map((r) => r.participant_id_number),
                    );

                    // Enrich previous participants with common data needed for documents
                    const enrichedPrevious = previousResult.data
                      .filter(
                        (p: any) =>
                          !existingCidNumbers.has(p.participant_id_number),
                      )
                      .map((p: any) => ({
                        ...p,
                        course_title: certificateData.certificate_title,
                        company_name: selectedOSI?.cliente_nombre_empresa || "",
                        osi_number: selectedOSI?.nro_osi || "",
                        city: certificateData.location || "Puerto La Cruz",
                        location: certificateData.location || "",
                        execution_address:
                          selectedOSI?.direccion_ejecucion || "",
                        execution_date: certificateData.date,
                      }));

                    // Combine lists
                    allParticipants = [
                      ...enrichedPrevious,
                      ...certificateRecords,
                    ];
                  }
                }
              }

              const result = await generateDocumentsServer({
                certificates: allParticipants,
                osiData: {
                  ...(selectedOSI || {}),
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
      const BATCH_SIZE = 15;

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
              paperSize: certificateData.paperSize,
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

      // Carnets are now created automatically by saveCertificatesToDatabase if emite_carnet is true
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

          // Carnets were already created server-side, now generate PDFs for download
          if (dbResult.certificateIds && dbResult.certificateIds.length > 0) {
            // Preload carnet template image as base64
            let carnetTemplateBase64 = "";
            let finalCarnetTemplateUrl = "/templates/carnet.png"; // Default fallback

            try {
              // Priority: initialData.activeCarnetTemplate (from server) > certificateData.id_plantilla_carnet > default
              if (initialData.activeCarnetTemplate?.archivo) {
                finalCarnetTemplateUrl = `/templates/${initialData.activeCarnetTemplate.archivo}`;
              } else if (certificateData.id_plantilla_carnet) {
                const selectedTemplate = carnetTemplates.find(
                  (template: any) =>
                    template.id === certificateData.id_plantilla_carnet,
                );
                if (
                  selectedTemplate?.archivo &&
                  selectedTemplate.archivo !== "carnet.png"
                ) {
                  finalCarnetTemplateUrl = `/templates/${selectedTemplate.archivo}`;
                }
              }

              // Try to preload the determined URL
              try {
                carnetTemplateBase64 = await preloadImage(
                  finalCarnetTemplateUrl,
                );
              } catch (preloadError) {
                console.warn(
                  `Failed to preload carnet template ${finalCarnetTemplateUrl}, falling back to default carnet.png`,
                  preloadError,
                );
                // If it wasn't already the default, try the default
                if (finalCarnetTemplateUrl !== "/templates/carnet.png") {
                  finalCarnetTemplateUrl = "/templates/carnet.png";
                  carnetTemplateBase64 = await preloadImage(
                    finalCarnetTemplateUrl,
                  );
                } else {
                  throw preloadError; // Already failed on default
                }
              }
            } catch (error) {
              console.error("Failed to load any carnet template:", error);
            }

            // Generate carnet PDFs concurrently in batches
            const carnetRequests = certificateData.participants.map(
              (participant, index) => {
                // Use preloaded base64 if available, otherwise use final URL
                const templateImage =
                  carnetTemplateBase64 || finalCarnetTemplateUrl;

                return {
                  participant,
                  carnetData: {
                    id_certificado: dbResult.certificateIds![index],
                    id_participante: dbResult.participantIds?.[index] || 0,
                    id_empresa: selectedOSI?.empresa_id || null,
                    id_curso: certificateData.course_topic_data?.id
                      ? parseInt(certificateData.course_topic_data.id)
                      : null,
                    id_osi: selectedOSI?.id ? (typeof selectedOSI.id === 'string' ? parseInt(selectedOSI.id) : selectedOSI.id) : null,
                    titulo_curso: certificateData.certificate_title,
                    subtitulo_curso: certificateData.certificate_subtitle || null,
                    fecha_emision: certificateData.date,
                    fecha_vencimiento:
                      certificateData.fecha_vencimiento || null,
                    nombre_participante: participant.name,
                    cedula_participante: participant.idNumber,
                    empresa_participante: participant.company || null,
                    nro_control:
                      dbResult.certificateNumbers![index].nro_control,
                  },
                  templateImage,
                  isPreview: false,
                };
              },
            );

            // Generate carnet PDFs in batches
            const CARNET_BATCH_SIZE = 15;
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
              "Error: Carnets no se generaron correctamente. Por favor revise los logs del servidor.",
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
        } else if (additionalDocsResult && "error" in additionalDocsResult) {
          console.error(
            "Document generation error:",
            additionalDocsResult.error,
          );
          alert(
            `Error generando documentos adicionales: ${additionalDocsResult.error}`,
          );
        }
      } catch (error) {
        console.error("Document generation exception:", error);
        alert(
          `Error generando documentos adicionales: ${error instanceof Error ? error.message : "Error desconocido"}`,
        );
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
        const osiNumber = selectedOSI?.nro_osi || "S-N";
        const clientName = (
          selectedOSI?.cliente_nombre_empresa || "Cliente"
        ).replace(/\s+/g, "_");
        const courseName = (selectedOSI?.curso_nombre || "Curso").replace(
          /\s+/g,
          "_",
        );
        const topicName = (certificateData.certificate_title || "Tema").replace(
          /\s+/g,
          "_",
        );

        const zipFilename = `${osiNumber}_${clientName}_${courseName}_${topicName}.zip`;

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
        generate_documents: true, // Reset to true
        include_previous_participants: true, // Reset to default
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
        {/* Mode Toggle - Only show if not in edit mode */}
        {!editData && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => handleModeSwitch("automatic")}
                className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                  osiInputMode === "automatic"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Seleccionar OSI (Automático)
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch("manual")}
                className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                  osiInputMode === "manual"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Ingreso Manual
              </button>
            </div>
          </div>
        )}

        {/* <CarnetDebug 
          selectedCourseTopic={selectedCourseTopic} 
          certificateData={certificateData} 
        /> */}

        {/* Conditional rendering based on mode */}
        {!editData && osiInputMode === "automatic" ? (
          <OSISearch
            osis={osis}
            selectedOSI={selectedOSI}
            onSelect={handleOSISelect}
            matchedCourse={selectedCourseTopic}
            allCourses={courses}
            disabled={!!editData}
          />
        ) : !editData && osiInputMode === "manual" ? (
          <ManualOSIInputComponent
            companies={companies}
            cities={cities}
            courseTopics={courses}
            data={manualOSIData}
            onDataChange={handleManualOSIDataChange}
            onCourseSelect={(courseTopic) => {
              setSelectedCourseTopic(courseTopic);
              const passingGrade = courseTopic.nota_aprobatoria ?? 14;
              setCertificateData((prev) => ({
                ...prev,
                course_topic_id: courseTopic.id,
                course_topic_data: courseTopic,
                // Don't set content here - let the hook in CertificateForm handle it
                // to ensure company templates are applied correctly
                course_content: "",
                course_template_id: "",
                passing_grade: passingGrade,
                horas_estimadas: courseTopic.horas_estimadas,
                certificate_title: prev.certificate_title || courseTopic.name,
                id_plantilla_certificado:
                  courseTopic.id_plantilla_certificado ||
                  prev.id_plantilla_certificado,
                fecha_vencimiento: courseTopic.emite_carnet
                  ? prev.fecha_vencimiento
                  : undefined,
              }));
            }}
            selectedCourseTopic={selectedCourseTopic}
            hasAttemptedSubmission={hasAttemptedManualSubmission}
            onHasAnyCertificatesChange={setManualOSIHasAnyCertificates}
            onHasCourseCertificatesChange={setManualOSIHasCourseCertificates}
          />
        ) : null}

        {/* Course Topic Search - Show in manual mode or when OSI is selected in automatic mode */}
        {!editData &&
          ((osiInputMode === "manual" && selectedCourseTopic) ||
            (osiInputMode === "automatic" && selectedOSI)) && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Curso Seleccionado
              </h3>
              {selectedCourseTopic && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="font-medium text-blue-900">
                    {selectedCourseTopic.nombre}
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {selectedCourseTopic.horas_estimadas &&
                      `Horas: ${selectedCourseTopic.horas_estimadas}`}
                    {selectedCourseTopic.emite_carnet && " • Emite carnet"}
                  </div>
                </div>
              )}
            </div>
          )}

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
          onPreview={handlePreview}
        />
      </div>
    </div>
  );
}
