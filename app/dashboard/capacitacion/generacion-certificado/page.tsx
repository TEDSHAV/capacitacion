"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  OSI,
  CourseTopic,
  CertificateGeneration,
  CertificateParticipant,
  CertificateOSI,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from './components/certificate-form';
import { getCertificateData } from '@/app/actions/certificate';
import { saveCertificatesToDatabase } from '@/app/actions/certificados';

export default function GeneracionCertificadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [osis, setOsis] = useState<CertificateOSI[]>([]);
  const [allCourseTopics, setAllCourseTopics] = useState<CourseTopic[]>([]);
  const [filteredCourseTopics, setFilteredCourseTopics] = useState<CourseTopic[]>([]);
  const [selectedOSI, setSelectedOSI] = useState<CertificateOSI | null>(null);
  const [selectedCourseTopic, setSelectedCourseTopic] = useState<CourseTopic | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateGeneration>({
    osi_id: "",
    certificate_title: "",
    certificate_subtitle: "",
    passing_grade: 14,
    course_topic_id: "",
    course_topic_data: undefined,
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
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFacilitator, setEditingFacilitator] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load with optimized limits - only what we need for the UI
        const result = await getCertificateData({ 
          osiLimit: 50,    // More than enough for dropdown (shows 10)
          courseLimit: 100  // Reasonable limit for course selection
        });

        if (result.error) {
          // Don't redirect, just show error
          return;
        }

        setOsis(result.osis || []);
        setAllCourseTopics(result.courseTopics || []);
        setFilteredCourseTopics(result.courseTopics || []);
      } catch (error) {
        // Error loading data
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOSISelect = (osi: CertificateOSI | null) => {
    setSelectedOSI(osi);

    if (osi) {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.id, // Use OSI ID, not OSI number
        osi_data: osi,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);

      // Find exact course by id_curso if available
      let selectedCourse: CourseTopic | null = null;
      
      if (osi.id_curso) {
        // Use the exact course ID from OSI
        selectedCourse = allCourseTopics.find(
          (topic: CourseTopic) => topic.id === osi.id_curso!.toString()
        ) || null;
      }

      // If no exact course found via id_curso, filter courses by client and show relevant options
      const clientCourses = allCourseTopics.filter((topic: CourseTopic) => {
        // OSI has empresa_id (number) and CourseTopic has cliente_asociado (number from DB)
        const osiClientId = osi.empresa_id;
        const courseClientId = topic.cliente_asociado;
        
        // Include courses associated with the client
        const isClientMatch = courseClientId && osiClientId === courseClientId;
        
        // Include courses that don't have any company association (cliente_asociado is null/undefined)
        const hasNoCompanyAssociation = !courseClientId;
        
        return isClientMatch || hasNoCompanyAssociation;
      });
      
      setFilteredCourseTopics(clientCourses);
      
      // Auto-select the course if found
      if (selectedCourse) {
        const passingGrade = selectedCourse.nota_aprobatoria ?? 14;
        
        setCertificateData((prev) => ({
          ...prev,
          course_topic_id: selectedCourse.id,
          course_topic_data: selectedCourse, // Add the course topic data
          course_content: selectedCourse.contenido_curso || '',
          passing_grade: passingGrade,
          horas_estimadas: selectedCourse.horas_estimadas, // Add horas_estimadas from matching course
          certificate_title: selectedCourse.name, // Autopopulate certificate title with course name
          id_plantilla_certificado: selectedCourse.id_plantilla_certificado || prev.id_plantilla_certificado, // Use course template if available
        }));
        setSelectedCourseTopic(selectedCourse);
      }
    } else {
      // Clear all related data when OSI is cleared
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
      // Show all courses when no OSI is selected
      setFilteredCourseTopics(allCourseTopics);
    }
  };

  const handleCertificateDataChange = (
    field: keyof CertificateGeneration,
    value: any,
  ) => {
    if (field === 'course_topic_id') {
      // Find the selected course topic and populate course content and passing grade
      const selectedTopic = allCourseTopics.find(topic => topic.id === value);
      
      if (selectedTopic) {
        const passingGrade = selectedTopic.nota_aprobatoria ?? 14;
        
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_topic_data: selectedTopic, // Add the course topic data
          course_content: selectedTopic.contenido_curso || '',
          passing_grade: passingGrade, // Use course's passing grade
          horas_estimadas: selectedTopic.horas_estimadas, // Add horas_estimadas from course topic
          certificate_title: prev.certificate_title || selectedTopic.name, // Autopopulate if title is empty
          id_plantilla_certificado: selectedTopic.id_plantilla_certificado || prev.id_plantilla_certificado, // Use course template if available
          // Clear expiration date if course doesn't emit card
          fecha_vencimiento: selectedTopic.emite_carnet ? prev.fecha_vencimiento : undefined,
        }));
        setSelectedCourseTopic(selectedTopic);
      } else {
        // No course topic found, using default passing grade of 14
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_content: '',
          passing_grade: 14, // Default to 14 if no course selected
          fecha_vencimiento: undefined, // Clear expiration date if no course selected
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
    // Validate required fields
    if (
      !certificateData.osi_id ||
      !certificateData.certificate_title ||
      !certificateData.course_topic_id ||
      certificateData.participants.length === 0
    ) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    // Additional validation for expiration date if course emits card
    if (selectedCourseTopic?.emite_carnet && !certificateData.fecha_vencimiento) {
      alert("Este curso emite carnet, por lo que la fecha de vencimiento es requerida");
      return;
    }

    try {
      setIsGenerating(true);
      
      // Step 1: Save certificates to database first to get actual control numbers
      const dbResult = await saveCertificatesToDatabase(
        certificateData,
        certificateData.participants
      );

      if (!dbResult.success) {
        alert(`Error guardando certificados en base de datos: ${dbResult.message}`);
        return;
      }

      if (!dbResult.certificateNumbers || dbResult.certificateNumbers.length === 0) {
        alert("Error: No se pudieron obtener los números de control de la base de datos");
        return;
      }

      // Step 2: Import the certificate generator
      const { CertificateGenerator } = await import('@/lib/certificate-generator');
      const generator = new CertificateGenerator();

      // Get template and seal images
      const templateImageUrl = '/templates/certificado.png';
      const sealImageUrl = '/templates/sello.png';
      
      // Step 3: Generate certificates with actual control numbers
      const certificates = [];
      for (let i = 0; i < certificateData.participants.length; i++) {
        const participant = certificateData.participants[i];
        const controlNumbers = dbResult.certificateNumbers![i];
        
        try {
          const blob = await generator.generateCertificate({
            participant,
            certificateData,
            templateImage: templateImageUrl,
            sealImage: sealImageUrl,
            controlNumbers,
            isPreview: false,
            certificateId: dbResult.certificateIds![i] // Pass the actual certificate ID
          });
          certificates.push({ participant, blob });
        } catch (error) {
          // Continue with other participants
        }
      }

      // Step 4: Download each certificate
      certificates.forEach(({ participant, blob }) => {
        const filename = `certificado_${participant.name.replace(/\s+/g, '_')}_${participant.id_number}.pdf`;
        generator.downloadBlob(blob, filename);
      });

      const successMessage = `Se generaron y guardaron ${certificates.length} certificados exitosamente! (${dbResult.certificateIds?.length} registros en base de datos)`;
      alert(successMessage);

      // Reset form
      setSelectedOSI(null);
      setSelectedCourseTopic(null);
      setCertificateData({
        osi_id: "",
        certificate_title: "",
        certificate_subtitle: "",
        passing_grade: 14,
        course_topic_id: "",
        course_content: "",
        participants: [],
        location: "",
        date: new Date().toISOString().split("T")[0],
        horas_estimadas: undefined,
        facilitator_id: undefined,
        sha_signature_id: undefined,
        fecha_vencimiento: undefined,
        id_estado: undefined,
        id_plantilla_certificado: undefined,
      });
    } catch (error) {
      alert("Error al generar los certificados. Por favor intenta nuevamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Generación de Certificados
        </h1>
        <p className="mt-2 text-gray-600">
          Crea certificados personalizados para los participantes de
          capacitaciones
        </p>
      </div>

      <div className="space-y-6">
        {/* OSI Search - First step in workflow */}
        <OSISearch
          osis={osis}
          selectedOSI={selectedOSI}
          onSelect={handleOSISelect}
        />

        {/* Certificate Form */}
        <CertificateForm
          certificateData={certificateData}
          selectedOSI={selectedOSI}
          selectedCourseTopic={selectedCourseTopic}
          courseTopics={filteredCourseTopics}
          isGenerating={isGenerating}
          onDataChange={handleCertificateDataChange}
          onParticipantsChange={handleParticipantsChange}
          onGenerate={handleGenerateCertificate}
        />
      </div>
    </div>
  );
}
