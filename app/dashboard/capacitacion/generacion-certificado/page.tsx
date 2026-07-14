"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  OSI,
  CourseTopic,
  CertificateGeneration,
  CertificateParticipant,
} from "@/types";
import OSISearch from "./components/osi-search";
import { CertificateForm } from './components/certificate-form';
import { getCertificateData } from '@/app/actions/certificate';

export default function GeneracionCertificadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [osis, setOsis] = useState<OSI[]>([]);
  const [allCourseTopics, setAllCourseTopics] = useState<CourseTopic[]>([]);
  const [filteredCourseTopics, setFilteredCourseTopics] = useState<CourseTopic[]>([]);
  const [selectedOSI, setSelectedOSI] = useState<OSI | null>(null);
  const [selectedCourseTopic, setSelectedCourseTopic] =
    useState<CourseTopic | null>(null);
  const [certificateData, setCertificateData] = useState<CertificateGeneration>(
    {
      osi_id: "",
      certificate_title: "",
      certificate_subtitle: "",
      passing_grade: 0,
      course_topic_id: "",
      course_content: "",
      participants: [],
      location: "",
      date: new Date().toISOString().split("T")[0],
    },
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await getCertificateData();

        if (result.error) {
          console.error("Error loading data:", result.error);
          // Don't redirect, just show error
          return;
        }

        setOsis(result.osis || []);
        setAllCourseTopics(result.courseTopics || []);
        setFilteredCourseTopics(result.courseTopics || []);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOSISelect = (osi: OSI | null) => {
    setSelectedOSI(osi);

    if (osi) {
      setCertificateData((prev) => ({
        ...prev,
        osi_id: osi.nro_osi,
        osi_data: osi,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);

      // Filter course topics by client from OSI AND by course content matching
      const clientCourses = allCourseTopics.filter((topic: CourseTopic) => {
        // OSI has empresa_id (number) and CourseTopic has cliente_asociado (number from DB)
        const osiClientId = osi.empresa_id;
        const courseClientId = topic.cliente_asociado;
        
        // Include courses associated with the client
        const isClientMatch = courseClientId && osiClientId === courseClientId;
        
        // Include courses that don't have any company association (cliente_asociado is null/undefined)
        const hasNoCompanyAssociation = !courseClientId;
        
        // Include if client matches OR has no company association
        // Also ensure content relevance for better UX
        const isContentRelevant = !osi.tema || (
          (osi.tema && topic.name.toLowerCase().includes(osi.tema!.toLowerCase())) ||
          (osi.detalle_capacitacion && (
            topic.name.toLowerCase().includes(osi.detalle_capacitacion!.toLowerCase()) ||
            (topic.description && topic.description.toLowerCase().includes(osi.detalle_capacitacion!.toLowerCase()))
          )) ||
          (osi.detalle_sesion && (
            topic.name.toLowerCase().includes(osi.detalle_sesion!.toLowerCase()) ||
            (topic.description && topic.description.toLowerCase().includes(osi.detalle_sesion!.toLowerCase()))
          ))
        );
        
        // Show if either: (client matches AND content is relevant) OR (has no company association AND content is relevant)
        return (isClientMatch || hasNoCompanyAssociation) && isContentRelevant;
      });
      
      setFilteredCourseTopics(clientCourses);
    } else {
      // Clear all related data when OSI is cleared
      setCertificateData((prev) => ({
        ...prev,
        osi_id: "",
        osi_data: undefined,
        course_topic_id: "",
        course_topic_data: undefined,
        course_content: "",
      }));
      setSelectedCourseTopic(null);
      // Show all courses when no OSI is selected
      setFilteredCourseTopics(allCourseTopics);
    }
  };

  const findMatchingCourseTopic = (osi: OSI): CourseTopic | null => {
    if (!osi.tema && !osi.detalle_capacitacion && !osi.detalle_sesion) {
      return null;
    }

    // Try to find exact match with tema
    let match = allCourseTopics.find(
      (topic: CourseTopic) =>
        osi.tema && topic.name.toLowerCase().includes(osi.tema!.toLowerCase()),
    );

    // If no exact match, try with detalle_capacitacion
    if (!match && osi.detalle_capacitacion) {
      match = allCourseTopics.find(
        (topic: CourseTopic) =>
          topic.name
            .toLowerCase()
            .includes(osi.detalle_capacitacion!.toLowerCase()) ||
          (topic.description &&
            topic.description
              .toLowerCase()
              .includes(osi.detalle_capacitacion!.toLowerCase())),
      );
    }

    // If still no match, try with detalle_sesion
    if (!match && osi.detalle_sesion) {
      match = allCourseTopics.find(
        (topic: CourseTopic) =>
          topic.name
            .toLowerCase()
            .includes(osi.detalle_sesion!.toLowerCase()) ||
          (topic.description &&
            topic.description
              .toLowerCase()
              .includes(osi.detalle_sesion!.toLowerCase())),
      );
    }

    return match || null;
  };

  const handleCertificateDataChange = (
    field: keyof CertificateGeneration,
    value: any,
  ) => {
    if (field === 'course_topic_id') {
      // Find the selected course topic and populate course content and passing grade
      const selectedTopic = allCourseTopics.find(topic => topic.id === value);
      console.log('Selected course topic:', selectedTopic);
      console.log('Available course topics:', allCourseTopics);
      
      if (selectedTopic) {
        const passingGrade = selectedTopic.nota_aprobatoria || 0;
        console.log(`Using passing grade: ${passingGrade} for course: ${selectedTopic.name}`);
        
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_content: selectedTopic.contenido_curso || '',
          passing_grade: passingGrade, // Use course's passing grade or default to 0
        }));
        setSelectedCourseTopic(selectedTopic);
      } else {
        console.log('No course topic found, using default passing grade of 0');
        setCertificateData((prev) => ({
          ...prev,
          [field]: value,
          course_content: '',
          passing_grade: 0, // Default to 0 if no course selected
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

    try {
      setIsGenerating(true);
      
      // Import the certificate generator
      const { CertificateGenerator } = await import('@/lib/certificate-generator');
      const generator = new CertificateGenerator();

      // Get template and seal images
      const templateImageUrl = '/templates/certificado.png';
      const sealImageUrl = '/templates/sello.png';
      
      // Generate certificates for all participants
      const certificates = await generator.generateMultipleCertificates(
        certificateData.participants,
        certificateData,
        templateImageUrl,
        sealImageUrl
      );

      // Download each certificate
      certificates.forEach(({ participant, blob }) => {
        const filename = `certificado_${participant.name.replace(/\s+/g, '_')}_${participant.id_number}.pdf`;
        generator.downloadBlob(blob, filename);
      });

      alert(`Se generaron ${certificates.length} certificados exitosamente!`);

      // Reset form
      setSelectedOSI(null);
      setSelectedCourseTopic(null);
      setCertificateData({
        osi_id: "",
        certificate_title: "",
        certificate_subtitle: "",
        passing_grade: 0,
        course_topic_id: "",
        participants: [],
        location: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (error) {
      console.error("Error generating certificates:", error);
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
